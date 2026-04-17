import { NextResponse } from 'next/server';
import { UsdtService } from '@/lib/payments/usdt';

/**
 * USDT Verification Endpoint
 * Manual trigger from frontend to check if USDT has landed on-chain
 */
export async function POST(req: Request) {
  try {
    const { transactionId } = await req.json();

    if (!transactionId) {
      return NextResponse.json({ error: 'Missing transactionId' }, { status: 400 });
    }

    const result = await UsdtService.verifyTransaction(transactionId);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[USDT VERIFY API ERROR]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
