import { NestFactory } from '@nestjs/core';
import 'reflect-metadata';
import { AppModule } from '../app.module';
import { SupabaseService } from '../database/supabase.service';

async function cleanupUncategorized() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const supabaseService = app.get(SupabaseService);
  const supabase = supabaseService.getClient();

  console.log('=== Cleaning Up Uncategorized Entries ===\n');

  try {
    // Step 1: Delete all "Uncategorized" entries from wallet_category_summary
    console.log('Step 1: Deleting stale "Uncategorized" entries...');
    const { data: deleted, error: deleteError } = await supabase
      .from('wallet_category_summary')
      .delete()
      .eq('category', 'Uncategorized');

    if (deleteError) {
      throw new Error(`Failed to delete uncategorized entries: ${deleteError.message}`);
    }

    console.log('✓ Deleted stale "Uncategorized" entries\n');

    // Step 2: Refresh all category summaries to rebuild from properly categorized markets
    console.log('Step 2: Refreshing category summaries...');
    
    // Get all unique wallets
    const { data: allSummaries, error: summariesError } = await supabase
      .from('wallet_market_summary')
      .select('wallet_address');
    
    if (summariesError) {
      throw new Error(`Failed to fetch wallet summaries: ${summariesError.message}`);
    }
    
    const wallets = Array.from(new Set((allSummaries || []).map(s => s.wallet_address)))
      .map(wallet_address => ({ wallet_address }));

    console.log(`Found ${wallets.length} unique wallets to refresh.\n`);

    for (let i = 0; i < wallets.length; i++) {
      const walletAddress = wallets[i].wallet_address;
      
      if ((i + 1) % 10 === 0) {
        console.log(`  Processing wallet ${i + 1}/${wallets.length}...`);
      }

      // Get all market summaries for this wallet
      const { data: summaries, error: summariesError } = await supabase
        .from('wallet_market_summary')
        .select(`
          market_slug,
          total_volume,
          total_interactions,
          pnl,
          is_finalized,
          markets!inner(category)
        `)
        .eq('wallet_address', walletAddress);

      if (summariesError || !summaries) {
        continue;
      }

      // Group by category and calculate totals
      const categoryData: { [category: string]: { volume: number; interactions: number; pnl: number; finalized: number; open: number } } = {};

      summaries.forEach((summary: any) => {
        const category = summary.markets?.category || 'Uncategorized';
        if (!categoryData[category]) {
          categoryData[category] = { volume: 0, interactions: 0, pnl: 0, finalized: 0, open: 0 };
        }
        categoryData[category].volume += parseFloat(summary.total_volume) || 0;
        categoryData[category].interactions += summary.total_interactions || 0;
        if (summary.is_finalized && summary.pnl !== null) {
          categoryData[category].pnl += parseFloat(summary.pnl) || 0;
          categoryData[category].finalized += 1;
        } else {
          categoryData[category].open += 1;
        }
      });

      // Upsert category summaries (excluding Uncategorized)
      for (const [category, data] of Object.entries(categoryData)) {
        if (category === 'Uncategorized') {
          continue; // Skip any remaining uncategorized entries
        }
        
        const { error: upsertError } = await supabase
          .from('wallet_category_summary')
          .upsert({
            wallet_address: walletAddress,
            category: category,
            total_volume: data.volume,
            total_interactions: data.interactions,
            finalized_markets_count: data.finalized,
            open_markets_count: data.open,
            pnl: data.pnl,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'wallet_address,category',
          });

        if (upsertError) {
          console.error(`  Error upserting category ${category} for ${walletAddress}: ${upsertError.message}`);
        }
      }
    }

    console.log(`\n✓ Refreshed category summaries for ${wallets.length} wallets`);

    // Step 3: Verify no uncategorized entries remain
    const { data: remaining, error: checkError } = await supabase
      .from('wallet_category_summary')
      .select('wallet_address')
      .eq('category', 'Uncategorized');

    if (checkError) {
      console.error(`Warning: Could not verify cleanup: ${checkError.message}`);
    } else {
      const remainingCount = remaining?.length || 0;
      if (remainingCount === 0) {
        console.log('\n✓ Verification: No "Uncategorized" entries remain');
      } else {
        console.log(`\n⚠ Warning: ${remainingCount} "Uncategorized" entries still exist`);
      }
    }

    console.log('\n=== Cleanup Complete! ===');
  } catch (error: any) {
    console.error('Error during cleanup:', error.message || error);
  } finally {
    await app.close();
  }
}

cleanupUncategorized();

