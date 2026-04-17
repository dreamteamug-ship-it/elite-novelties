import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { StripeService } from '@/lib/payments/stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

/**
 * Stripe Webhook Endpoint
 * Listen for Global Card/Apple/Google Pay confirmation
 */
export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    console.log('[STRIPE WEBHOOK RECEIVED]', event.type);

    const result = await StripeService.processWebhook(event);

    return NextResponse.json({ 
      success: true, 
      processed: result.success 
    });
  } catch (err: any) {
    console.error('[STRIPE WEBHOOK ERROR]', err.message);
    return NextResponse.json({ 
      error: `Webhook Error: ${err.message}` 
    }, { status: 400 });
  }
}
