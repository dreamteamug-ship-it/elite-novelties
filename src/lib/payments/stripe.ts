import Stripe from 'stripe';
import { supabaseAdmin } from '../supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_123', {
  apiVersion: '2023-10-16' as any,
});

/**
 * Stripe Global Gateway Utility
 * Phase 4.2: USD/EUR/CNY -> KES Mirror Settlement
 */
export class StripeService {
  /**
   * Create Payment Intent for Cards/Apple Pay/Google Pay
   */
  static async createPaymentIntent(amount: number, currency: string, orderId: string, transactionId: string) {
    console.log(`[STRIPE] Creating PaymentIntent for Order ${orderId} - ${amount} ${currency}`);

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata: { 
          order_id: orderId, 
          transaction_id: transactionId 
        },
        automatic_payment_methods: { enabled: true },
      });

      // Log in stripe_payments table
      await supabaseAdmin.from('stripe_payments').insert([{
        transaction_id: transactionId,
        payment_intent_id: paymentIntent.id,
        status: 'requires_payment_method',
        amount_received: 0
      }]);

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      };
    } catch (error: any) {
      console.error('[STRIPE INTENT ERROR]', error.message);
      throw new Error(`Stripe Initiation Failed: ${error.message}`);
    }
  }

  /**
   * Process Secure Stripe Webhook
   */
  static async processWebhook(event: Stripe.Event) {
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const { transaction_id, order_id } = paymentIntent.metadata;

      console.log(`[STRIPE WEBHOOK] Payment succeeded for Order ${order_id}`);

      // 1. Fetch Transaction Ledger
      const { data: tx, error: txError } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .eq('id', transaction_id)
        .single();

      if (txError || !tx) throw new Error('Transaction not found in ledger');

      // 2. LEDGER MATH: Calculate 1.5% Platform Fee (applied to converted KES)
      const platformFee = Math.round(tx.amount_kes * 0.015);
      const netSettlement = tx.amount_kes - platformFee;

      // 3. ATOMIC UPDATE: Mark Transaction Completed
      await supabaseAdmin
        .from('transactions')
        .update({ 
          status: 'completed',
          metadata: { 
            ...tx.metadata, 
            platform_fee_kes: platformFee, 
            net_settlement_kes: netSettlement,
            stripe_pi_id: paymentIntent.id 
          }
        })
        .eq('id', tx.id);

      // 4. Update Stripe Record
      await supabaseAdmin
        .from('stripe_payments')
        .update({ 
          status: 'succeeded', 
          amount_received: paymentIntent.amount_received / 100 
        })
        .eq('payment_intent_id', paymentIntent.id);

      // 5. Queue Settlement to Cooperative Bank: 01192952690600
      await supabaseAdmin.from('settlements').insert([{
        transaction_id: tx.id,
        amount_kes: netSettlement,
        destination_bank: 'COOPERATIVE BANK OF KENYA',
        destination_account: '01192952690600',
        status: 'pending'
      }]);

      console.log(`✅ [LEDGER] Stripe Order ${order_id} settled. Net: KES ${netSettlement}`);
      return { success: true };
    }

    return { success: false, message: 'Event ignored' };
  }
}
