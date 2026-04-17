import { NextResponse } from 'next/server';
import { TumaService } from '@/lib/payments/tuma';

/**
 * Tuma / M-PESA Callback Endpoint
 * Listen for STK Push confirmation
 */
export async function POST(req: Request) {
  try {
    const payload = await req.json();
    console.log('[TUMA WEBHOOK RECEIVED]', JSON.stringify(payload));

    const result = await TumaService.processTumaWebhook(payload);

    if (result.success) {
      return NextResponse.json({ message: 'Callback Processed Successfully' }, { status: 200 });
    } else {
      return NextResponse.json({ message: 'Callback Received (Transaction Incomplete)' }, { status: 200 });
    }
  } catch (error: any) {
    console.error('[TUMA WEBHOOK ERROR]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
