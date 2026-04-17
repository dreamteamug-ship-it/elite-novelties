import { NextResponse } from 'next/server';
import { CashCloudSettlementService, CheckoutRequest } from '@/lib/settlement-service';

export async function POST(req: Request) {
  try {
    const body: CheckoutRequest = await req.json();

    // Validating required fields
    if (!body.amount || !body.provider || !body.customerId) {
      return NextResponse.json({ error: 'Missing required checkout fields' }, { status: 400 });
    }

    const result = await CashCloudSettlementService.initiate(body);

    return NextResponse.json({
      success: true,
      ...result,
      message: `Checkout initiated via ${body.provider}.`
    });
  } catch (error: any) {
    console.error('[CHECKOUT ERROR]', error);
    return NextResponse.json({ error: error.message || 'Checkout failed' }, { status: 500 });
  }
}
