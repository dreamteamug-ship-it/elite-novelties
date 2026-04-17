import { NextResponse } from 'next/server';
import { CJDropshippingService } from '@/lib/agents/cj-service';

/**
 * CJ Dropshipping Automated Fulfillment
 * PHASE 3.3 Integration
 */
export async function POST(req: Request) {
  try {
    const { orderId, cjId, quantity, shippingAddress } = await req.json();

    const result = await CJDropshippingService.createOrder({
      orderId,
      cjId,
      quantity,
      shippingAddress: shippingAddress || {
         full_name: 'CashCloud Customer',
         address: 'Nairobi, Kenya',
         phone: '254123456789'
      }
    });

    return NextResponse.json({
      success: true,
      cjOrderId: result.cjOrderId,
      message: 'Automated fulfillment routed to CJ Dropshipping'
    });
  } catch (error: any) {
    console.error('[FULFILLMENT ERROR]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
