import axios from 'axios';
import { supabaseAdmin } from '../supabase';

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_API_URL = process.env.PAYPAL_MODE === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

/**
 * PayPal Global Gateway Utility
 * Phase 4.3: Global PayPal -> KES Mirror Settlement
 */
export class PaypalService {
  private static async getAccessToken() {
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');
    const response = await axios.post(`${PAYPAL_API_URL}/v1/oauth2/token`, 'grant_type=client_credentials', {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data.access_token;
  }

  /**
   * Create PayPal Order
   */
  static async createOrder(amount: number, currency: string, orderId: string, transactionId: string) {
    const accessToken = await this.getAccessToken();
    
    const response = await axios.post(`${PAYPAL_API_URL}/v2/checkout/orders`, {
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: orderId,
        amount: {
          currency_code: currency.toUpperCase(),
          value: amount.toFixed(2),
        },
        metadata: { transaction_id: transactionId }
      }],
      application_context: {
        brand_name: 'CashCloud Elite',
        user_action: 'PAY_NOW',
        return_url: `${process.env.APP_URL}/success?orderId=${orderId}`,
        cancel_url: `${process.env.APP_URL}/cancel`,
      }
    }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    await supabaseAdmin.from('paypal_transactions').insert([{
      transaction_id: transactionId,
      paypal_order_id: response.data.id,
      status: 'created'
    }]);

    return {
      orderId: response.data.id,
      links: response.data.links
    };
  }

  /**
   * Capture PayPal Order (Finalize Payment)
   */
  static async captureOrder(paypalOrderId: string) {
    const accessToken = await this.getAccessToken();
    
    const response = await axios.post(`${PAYPAL_API_URL}/v2/checkout/orders/${paypalOrderId}/capture`, {}, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.data.status === 'COMPLETED') {
      // Fetch internal PayPal record to get transaction_id
      const { data: ppTx } = await supabaseAdmin
        .from('paypal_transactions')
        .select('transaction_id')
        .eq('paypal_order_id', paypalOrderId)
        .single();

      if (ppTx) {
        await this.finalizeLedger(ppTx.transaction_id, paypalOrderId);
      }
    }

    return response.data;
  }

  private static async finalizeLedger(transactionId: string, paypalOrderId: string) {
    // 1. Fetch Transaction Ledger
    const { data: tx } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (!tx) return;

    // 2. LEDGER MATH: 1.5% Platform Fee
    const platformFee = Math.round(tx.amount_kes * 0.015);
    const netSettlement = tx.amount_kes - platformFee;

    // 3. ATOMIC UPDATE
    await supabaseAdmin
      .from('transactions')
      .update({ 
        status: 'completed',
        metadata: { 
          ...tx.metadata, 
          platform_fee_kes: platformFee, 
          net_settlement_kes: netSettlement,
          paypal_order_id: paypalOrderId 
        }
      })
      .eq('id', tx.id);

    // 4. Update PayPal Table
    await supabaseAdmin
      .from('paypal_transactions')
      .update({ status: 'completed' })
      .eq('paypal_order_id', paypalOrderId);

    // 5. Queue Settlement to Cooperative Bank
    await supabaseAdmin.from('settlements').insert([{
      transaction_id: tx.id,
      amount_kes: netSettlement,
      destination_bank: 'COOPERATIVE BANK OF KENYA',
      destination_account: '01192952690600',
      status: 'pending'
    }]);

    console.log(`✅ [LEDGER] PayPal Order ${paypalOrderId} settled. Net: KES ${netSettlement}`);
  }
}
