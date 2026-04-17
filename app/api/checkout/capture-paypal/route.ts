import { NextResponse } from 'next/server';
import { PaypalService } from '@/lib/payments/paypal';

/**
 * PayPal Capture Endpoint
 * Finalize the PayPal order after customer authorization
 */
export async function POST(req: Request) {
  try {
    const { paypalOrderId } = await req.json();

    if (!paypalOrderId) {
      return NextResponse.json({ error: 'Missing paypalOrderId' }, { status: 400 });
    }

    const result = await PaypalService.captureOrder(paypalOrderId);

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('[PAYPAL CAPTURE API ERROR]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
