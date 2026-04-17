import { AgentSwarm } from './agents/swarm';
import { CashCloudService } from './payment-service';

export class Simulator {
  /**
   * Run a Full Autonomous Test Cycle
   */
  static async runFullTestCycle() {
    console.log('[SIMULATOR] Starting Full End-to-End Cycle Test...');
    
    // 1. Swarm Discovery & Warehouse
    await AgentSwarm.runCycle();

    // 2. Simulate Order Injection
    const mockOrder = {
      method: 'card' as const,
      amount: 1495,
      currency: 'USD' as const,
      recipientId: 'ALTOVEX-001',
      settlement: 'mpesa' as const,
    };

    console.log('[SIMULATOR] Injecting Mock Global Order...');
    const orderResult = await CashCloudService.process(mockOrder);
    
    // 3. Simulate Successful Settlement
    console.log('[SIMULATOR] Simulating Mirror Settlement to Kenya...');
    await CashCloudService.settleFunds(orderResult.orderId, orderResult.amountKES, 'mpesa');

    console.log('[SIMULATOR] End-to-End Cycle Test Completed Successfully.');
    return {
      status: 'success',
      order: orderResult,
      cycleLogs: 'Check Supabase Agent Logs for Swarm status'
    };
  }
}
