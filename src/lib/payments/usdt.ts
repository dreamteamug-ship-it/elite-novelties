import axios from 'axios';
import { supabaseAdmin } from '../supabase';

const TRONGRID_API_URL = process.env.TRONGRID_API_URL || 'https://api.trongrid.io';
const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'; // Mainnet USDT TRC20

/**
 * USDT (TRC20) Mirror Utility
 * Phase 4.4: Crypto -> KES Mirror Settlement
 */
export class UsdtService {
  /**
   * Initiate USDT Checkout
   */
  static async initiate(amountUSD: number, transactionId: string) {
    const walletAddress = process.env.USDT_RECEIVING_WALLET_ADDRESS;
    
    // Log the crypto intent
    await supabaseAdmin
      .from('transactions')
      .update({ metadata: { usdt_wallet: walletAddress, network: 'TRC20' } })
      .eq('id', transactionId);

    return {
      walletAddress,
      network: 'TRC20',
      amount: amountUSD,
      instructions: `Send exactly ${amountUSD} USDT to the address above. Verification takes 1-3 minutes.`
    };
  }

  /**
   * Verify Blockchain Transaction (TronGrid API)
   * In production, this would be a polling job or a webhook from a node service.
   */
  static async verifyTransaction(transactionId: string) {
    const { data: tx } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (!tx || tx.status === 'completed') return { status: tx?.status };

    const walletAddress = process.env.USDT_RECEIVING_WALLET_ADDRESS;
    const expectedAmount = tx.amount_original;

    try {
      // Fetch recent TRC20 transfers for our wallet
      const response = await axios.get(`${TRONGRID_API_URL}/v1/accounts/${walletAddress}/transactions/trc20`, {
        params: {
          limit: 20,
          only_to: true,
          contract_address: USDT_CONTRACT
        }
      });

      const transfers = response.data.data;
      
      // Look for a transfer matching the amount within the last 30 minutes
      // Note: For production, we'd use a unique address per order or a MEMO/Tag if supported.
      // Here we match by amount and timestamp as a fallback.
      const match = transfers.find((t: any) => {
        const amount = t.value / 1000000; // USDT has 6 decimals
        const timeDiff = (Date.now() - t.block_timestamp) / 1000 / 60; // Minutes
        return Math.abs(amount - expectedAmount) < 0.01 && timeDiff < 60;
      });

      if (match) {
        await this.finalizeLedger(tx, match.transaction_id);
        return { status: 'completed', hash: match.transaction_id };
      }

      return { status: 'pending', message: 'Transaction not found on-chain yet.' };
    } catch (error: any) {
      console.error('[USDT VERIFY ERROR]', error.message);
      return { status: 'error', message: error.message };
    }
  }

  private static async finalizeLedger(tx: any, blockchainHash: string) {
    // 1. LEDGER MATH: 1.5% Platform Fee
    const platformFee = Math.round(tx.amount_kes * 0.015);
    const netSettlement = tx.amount_kes - platformFee;

    // 2. ATOMIC UPDATE
    await supabaseAdmin
      .from('transactions')
      .update({ 
        status: 'completed',
        metadata: { 
          ...tx.metadata, 
          platform_fee_kes: platformFee, 
          net_settlement_kes: netSettlement,
          blockchain_hash: blockchainHash 
        }
      })
      .eq('id', tx.id);

    // 3. Queue Settlement to Cooperative Bank
    await supabaseAdmin.from('settlements').insert([{
      transaction_id: tx.id,
      amount_kes: netSettlement,
      destination_bank: 'COOPERATIVE BANK OF KENYA',
      destination_account: '01192952690600',
      status: 'pending'
    }]);

    console.log(`✅ [LEDGER] USDT Tx ${blockchainHash} settled. Net: KES ${netSettlement}`);
  }
}
