import { NestFactory } from '@nestjs/core';
import 'reflect-metadata';
import { AppModule } from '../app.module';
import { SupabaseService } from '../database/supabase.service';

async function refreshCategorySummaries() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const supabaseService = app.get(SupabaseService);
  const supabase = supabaseService.getClient();

  console.log('=== Refreshing Category Summaries ===\n');

  try {
    // Clear existing summaries to remove old AI categories
    console.log('Clearing old category summaries...');
    const { error: clearError } = await supabase
      .from('wallet_category_summary')
      .delete()
      .neq('wallet_address', ''); // Delete all rows

    if (clearError) throw clearError;
    const allWallets: string[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('wallet_market_summary')
        .select('wallet_address')
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        throw new Error(`Failed to fetch wallet addresses: ${error.message}`);
      }

      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        data.forEach(s => allWallets.push(s.wallet_address));
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      }
    }
    
    // Get unique wallet addresses
    const uniqueWallets = Array.from(new Set(allWallets));

    if (uniqueWallets.length === 0) {
      console.log('No wallets found. Exiting.');
      await app.close();
      return;
    }

    console.log(`Found ${uniqueWallets.length} unique wallets.`);

    for (let i = 0; i < uniqueWallets.length; i++) {
      const walletAddress = uniqueWallets[i];
      console.log(`[${i + 1}/${uniqueWallets.length}] Refreshing category summaries for wallet: ${walletAddress}`);

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
        console.error(`  Error fetching market summaries: ${summariesError?.message}`);
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

      // Upsert category summaries
      for (const [category, data] of Object.entries(categoryData)) {
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
          console.error(`  Error upserting category ${category}: ${upsertError.message}`);
        }
      }

      console.log(`  Updated ${Object.keys(categoryData).length} categories`);
    }

    console.log('\n=== Category Summary Refresh Complete! ===');
  } catch (error) {
    console.error('Error during category summary refresh:', error);
  } finally {
    await app.close();
  }
}

refreshCategorySummaries();
