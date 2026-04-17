import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { CashCloudSettlementService } from '@/lib/settlement-service';

export async function POST(req: Request) {
  const body = await req.json();

  // Lead Architect: Daraja/Tuma callback structure verification
  // Typically: Body.stkCallback.ResultCode === 0
  const resultCode = body.Body?.stkCallback?.ResultCode;
  const checkoutRequestId = body.Body?.stkCallback?.CheckoutRequestID;

  if (resultCode === 0) {
    const metadata = body.Body.stkCallback.CallbackMetadata.Item;
    const mpesaReceipt = metadata.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value;

    // Find the associated transaction via phone or metadata mapping
    // In production, you'd query tuma_transactions by checkoutRequestId
    const { data: tumaTx } = await supabaseAdmin
      .from('tuma_transactions')
      .select('transaction_id')
      .eq('status', 'requested') // Or use a mapping ID
      .limit(1)
      .single();

    if (tumaTx) {
      // 1. Update Transaction Ledger
      await supabaseAdmin
        .from('transactions')
        .update({ status: 'completed' })
        .eq('id', tumaTx.transaction_id);

      // 2. Update M-Pesa Record
      await supabaseAdmin
        .from('tuma_transactions')
        .update({ status: 'completed', mpesa_receipt_number: mpesaReceipt, raw_callback_data: body })
        .eq('transaction_id', tumaTx.transaction_id);

      // 3. Trigger Mirror Settlement to Co-op Bank
      await CashCloudSettlementService.processSettlement(tumaTx.transaction_id);
    }
  }

  return NextResponse.json({ success: true });
}
