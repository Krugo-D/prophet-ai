import { NestFactory } from '@nestjs/core';
import 'reflect-metadata';
import { AppModule } from '../app.module';
import { PnlService } from '../pnl/pnl.service';
import { SupabaseService } from '../database/supabase.service';

/**
 * Script to calculate PnL for all finalized markets
 * This should be run after backfilling wallet data
 */
async function calculatePnL() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const pnlService = app.get(PnlService);
  const supabaseService = app.get(SupabaseService);
  const supabase = supabaseService.getClient();

  console.log('=== Calculating PnL for Finalized Markets ===\n');

  try {
    // Get all unique wallets that have transactions
    const { data: wallets } = await supabase
      .from('wallet_transactions')
      .select('wallet_address')
      .order('wallet_address');

    if (!wallets || wallets.length === 0) {
      console.log('No wallets found. Exiting.');
      await app.close();
      return;
    }

    const uniqueWallets = [...new Set(wallets.map(w => w.wallet_address))];
    console.log(`Found ${uniqueWallets.length} unique wallets\n`);

    // Calculate PnL for each wallet
    for (let i = 0; i < uniqueWallets.length; i++) {
      const walletAddress = uniqueWallets[i];
      console.log(`[${i + 1}/${uniqueWallets.length}] Calculating PnL for wallet: ${walletAddress}`);
      
      try {
        await pnlService.calculateWalletPnL(walletAddress);
        console.log(`  ✓ PnL calculated and category summaries updated\n`);
      } catch (error: any) {
        console.error(`  ✗ Error: ${error.message}\n`);
      }
    }

    console.log('=== PnL Calculation Complete! ===');
    console.log(`Processed ${uniqueWallets.length} wallets`);
  } catch (error: any) {
    console.error('Error calculating PnL:', error.message || error);
  } finally {
    await app.close();
  }
}

calculatePnL();


