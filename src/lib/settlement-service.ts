import { supabaseAdmin } from './supabase';
import Stripe from 'stripe';
import axios from 'axios';
import { TumaService } from './payments/tuma';
import { StripeService } from './payments/stripe';
import { PaypalService } from './payments/paypal';
import { UsdtService } from './payments/usdt';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

export type PaymentProvider = 'stripe' | 'mpesa' | 'paypal' | 'usdt' | 'jenga';

export interface CheckoutRequest {
  provider: PaymentProvider;
  productId: string;
  customerId: string;
  amount: number;
  currency: string;
  metadata?: any;
}

export class CashCloudSettlementService {
  /**
   * 1. Initiate Transaction & Ledger Entry
   */
  static async initiate(req: CheckoutRequest) {
    const exchangeRate = await this.getExchangeRate(req.currency, 'KES');
    const amountKES = Math.round(req.amount * exchangeRate);
    const orderId = `CASHCLOUD-${Date.now()}`;

    // Create Base Transaction Ledger
    const { data: transaction, error: txError } = await supabaseAdmin
      .from('transactions')
      .insert([{
        order_id: orderId,
        customer_id: req.customerId,
        amount_original: req.amount,
        currency_original: req.currency,
        amount_kes: amountKES,
        exchange_rate: exchangeRate,
        payment_method: req.provider,
        status: 'pending',
        metadata: { ...req.metadata, productId: req.productId }
      }])
      .select()
      .single();

    if (txError) throw txError;

    // Route to Provider Logic
    let providerData;
    switch (req.provider) {
      case 'stripe':
        providerData = await this.initiateStripe(transaction);
        break;
      case 'mpesa':
        providerData = await this.initiateMpesa(transaction, req.metadata.phone);
        break;
      case 'paypal':
        providerData = await this.initiatePayPal(transaction);
        break;
      case 'usdt':
        providerData = await this.initiateUSDT(transaction);
        break;
      default:
        throw new Error('Unsupported provider');
    }

    return {
      transactionId: transaction.id,
      orderId: transaction.order_id,
      amountKES: transaction.amount_kes,
      ...providerData
    };
  }

  /**
   * STRIPE: Cards, Apple/Google Pay
   */
  private static async initiateStripe(tx: any) {
    // Phase 4.2: Wired to Stripe Service
    const result = await StripeService.createPaymentIntent(
      tx.amount_original, 
      tx.currency_original, 
      tx.order_id, 
      tx.id
    );

    return { 
      clientSecret: result.clientSecret, 
      type: 'stripe',
      paymentIntentId: result.paymentIntentId 
    };
  }

  /**
   * M-PESA: Tuma / Daraja STK Push
   */
  private static async initiateMpesa(tx: any, phone: string) {
    // Phase 4.1: Wired to Tuma Service
    const response = await TumaService.initiateSTKPush(phone, tx.amount_kes, tx.order_id);

    return { 
      type: 'mpesa', 
      instructions: 'Please check your phone for the M-PESA PIN prompt.',
      phone,
      checkoutRequestId: response.CheckoutRequestID
    };
  }

  /**
   * PAYPAL: Orders API
   */
  private static async initiatePayPal(tx: any) {
    // Phase 4.3: Wired to PayPal Service
    const result = await PaypalService.createOrder(
      tx.amount_original,
      tx.currency_original,
      tx.order_id,
      tx.id
    );

    const approvalLink = result.links.find((l: any) => l.rel === 'approve')?.href;

    return { 
      type: 'paypal', 
      paymentUrl: approvalLink,
      paypalOrderId: result.orderId
    };
  }

  /**
   * USDT: TRC20 Wallet Ingestion
   */
  private static async initiateUSDT(tx: any) {
    // Phase 4.4: Wired to USDT Service
    return await UsdtService.initiate(tx.amount_original, tx.id);
  }

  /**
   * SETTLEMENT: The Mirror Action (Cooperative Bank)
   */
  static async processSettlement(transactionId: string) {
    const { data: tx, error } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (error || tx.status !== 'completed') return;

    // Check if settlement already exists to prevent double payout
    const { data: existingSettlement } = await supabaseAdmin
      .from('settlements')
      .select('id')
      .eq('transaction_id', tx.id)
      .single();

    if (existingSettlement) return;

    // Create Settlement Record for Coop Bank: 01192952690600
    // Ledger math (1.5% fee) is now handled in TumaService.processTumaWebhook
    // but we ensure it's recorded here too for consistency.
    const netAmount = tx.metadata.net_settlement_kes || tx.amount_kes;

    await supabaseAdmin.from('settlements').insert([{
      transaction_id: tx.id,
      amount_kes: netAmount,
      destination_bank: 'COOPERATIVE BANK OF KENYA',
      destination_account: '01192952690600',
      status: 'pending'
    }]);

    console.log(`[SETTLEMENT] Payout queued for ${tx.order_id} to Cooperative Bank. Amount: KES ${netAmount}`);
  }

  private static async getExchangeRate(from: string, to: string): Promise<number> {
    const rates: any = { 'USD': 128.5, 'CNY': 17.8, 'EUR': 139.2, 'KES': 1 };
    return rates[from] || 1;
  }
}
