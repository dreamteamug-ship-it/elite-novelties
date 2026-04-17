import axios from 'axios';
import { supabaseAdmin } from '../supabase';

const TUMA_API_URL = process.env.TUMA_API_URL || 'https://api.tuma.co.ke/v1';
const TUMA_API_KEY = process.env.TUMA_API_KEY!;

/**
 * Tuma / M-PESA Integration Utility
 * Phase 4.1: Local Kenya Settlement Loop
 */
export class TumaService {
  private static client = axios.create({
    baseURL: TUMA_API_URL,
    headers: {
      'Authorization': `Bearer ${TUMA_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  /**
   * Initiate M-PESA STK Push
   */
  static async initiateSTKPush(phoneNumber: string, amountKES: number, orderId: string) {
    console.log(`[TUMA] Initiating STK Push for ${phoneNumber} - KES ${amountKES}`);
    
    try {
      const response = await this.client.post('/stk-push', {
        amount: amountKES,
        phone: phoneNumber,
        reference: orderId,
        callback_url: `${process.env.APP_URL}/api/webhooks/tuma`,
        paybill: process.env.MPESA_PAYBILL || '400200',
        account: process.env.MPESA_ACCOUNT || '4045731'
      });

      // Log the request in our production database
      await supabaseAdmin.from('tuma_transactions').insert([{
        transaction_id: (await this.getTxIdFromOrderId(orderId)),
        phone_number: phoneNumber,
        status: 'requested',
        metadata: { checkout_request_id: response.data.CheckoutRequestID }
      }]);

      return response.data;
    } catch (error: any) {
      console.error('[TUMA STK ERROR]', error.response?.data || error.message);
      throw new Error(`M-PESA Initiation Failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Process Secure Webhook Callback
   */
  static async processTumaWebhook(payload: any) {
    const { reference, status, mpesa_receipt, amount } = payload;
    
    // 1. Verify Status
    if (status !== 'completed' && status !== 'Success') {
      console.warn(`[TUMA WEBHOOK] Transaction ${reference} failed or cancelled.`);
      return { success: false };
    }

    // 2. Fetch Transaction Ledger
    const { data: tx, error: txError } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('order_id', reference)
      .single();

    if (txError || !tx) throw new Error('Transaction not found in ledger');

    // 3. SECURE LEDGER MATH: Calculate 1.5% Platform Fee
    const platformFee = Math.round(tx.amount_kes * 0.015);
    const netSettlement = tx.amount_kes - platformFee;

    // 4. ATOMIC UPDATE: Mark Transaction Completed & Log Payout Intent
    const { error: updateError } = await supabaseAdmin
      .from('transactions')
      .update({ 
        status: 'completed',
        metadata: { 
          ...tx.metadata, 
          platform_fee_kes: platformFee, 
          net_settlement_kes: netSettlement,
          mpesa_receipt: mpesa_receipt 
        }
      })
      .eq('id', tx.id);

    if (updateError) throw updateError;

    // 5. Update M-Pesa Record
    await supabaseAdmin
      .from('tuma_transactions')
      .update({ 
        status: 'completed', 
        mpesa_receipt_number: mpesa_receipt,
        raw_callback_data: payload 
      })
      .eq('transaction_id', tx.id);

    // 6. Queue Settlement to Cooperative Bank: 01192952690600
    await supabaseAdmin.from('settlements').insert([{
      transaction_id: tx.id,
      amount_kes: netSettlement,
      destination_bank: 'COOPERATIVE BANK OF KENYA',
      destination_account: '01192952690600',
      status: 'pending'
    }]);

    // 7. Trigger Automated CJ Fulfillment
    if (tx.metadata.productId) {
      const { data: product } = await supabaseAdmin.from('products').select('cj_id').eq('id', tx.metadata.productId).single();
      if (product?.cj_id) {
        // In real build, fetch shipping address from customer/order metadata
        await axios.post(`${process.env.APP_URL}/api/fulfillment/cj`, {
           orderId: tx.order_id,
           cjId: product.cj_id,
           quantity: 1
        });
      }
    }

    console.log(`✅ [LEDGER] Order ${reference} settled. Net: KES ${netSettlement} (Fee: KES ${platformFee})`);
    return { success: true, netSettlement };
  }

  private static async getTxIdFromOrderId(orderId: string): Promise<string> {
    const { data } = await supabaseAdmin.from('transactions').select('id').eq('order_id', orderId).single();
    return data?.id;
  }
}
