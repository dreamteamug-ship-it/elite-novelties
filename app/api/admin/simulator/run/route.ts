import { NextResponse } from 'next/server';
import { Simulator } from '@/lib/simulator';

export async function POST() {
  try {
    const result = await Simulator.runFullTestCycle();

    return NextResponse.json({
      success: true,
      message: 'Full End-to-End Cycle Test Initiated & Completed.',
      details: result,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
