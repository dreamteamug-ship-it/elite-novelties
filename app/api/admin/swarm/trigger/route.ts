import { NextResponse } from 'next/server';
import { AgentSwarm } from '@/lib/agents/swarm';

export async function POST() {
  try {
    // Lead Architect: Triggering the 95% Autonomous Cycle
    AgentSwarm.runCycle(); // Async, fire and forget for the API response

    return NextResponse.json({
      success: true,
      message: 'Autonomous Swarm Cycle Initiated. Monitor via Command Center.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
