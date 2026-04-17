import { NextResponse } from 'next/server';
import { CashCloudService, PaymentRequest } from '@/lib/payment-service';

export async function POST(req: Request) {
  try {
    const body: PaymentRequest = await req.json();

    // Lead Architect: Basic Validation
    if (!body.amount || body.amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const result = await CashCloudService.process(body);

    return NextResponse.json({
      success: true,
      ...result,
      instructions: `Follow the gateway to complete your ${body.method} transfer to ${body.settlement}.`,
    });
  } catch (error: any) {
    console.error('Payment Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
