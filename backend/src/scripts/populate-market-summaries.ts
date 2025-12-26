import { NestFactory } from '@nestjs/core';
import 'reflect-metadata';
import { AppModule } from '../app.module';
import { SupabaseService } from '../database/supabase.service';

async function populateMarketSummaries() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const supabaseService = app.get(SupabaseService);
  const supabase = supabaseService.getClient();

  console.log('=== Populating Market Summaries ===\n');

  try {
    // Manually populate wallet_market_summary from wallet_transactions
    const { error } = await supabase.rpc('populate_market_summaries');

    if (error) {
      // If the function doesn't exist, do it manually
      console.log('Function not found, populating manually...');
      
      // Fetch transactions in batches
      let allTransactions: any[] = [];
      let offset = 0;
      const limit = 1000;
      let hasMore = true;

      console.log('Fetching transactions...');
      while (hasMore) {
        const { data: transactions, error: txError } = await supabase
          .from('wallet_transactions')
          .select('wallet_address, market_slug, side, volume_usd, shares_normalized, timestamp')
          .range(offset, offset + limit - 1);

        if (txError) {
          throw new Error(`Failed to fetch transactions: ${txError.message}`);
        }

        if (transactions && transactions.length > 0) {
          allTransactions = allTransactions.concat(transactions);
          offset += limit;
          hasMore = transactions.length === limit;
          console.log(`  Fetched ${allTransactions.length} transactions...`);
        } else {
          hasMore = false;
        }
      }

      if (allTransactions.length === 0) {
        console.log('No transactions found.');
        await app.close();
        return;
      }

      console.log(`Processing ${allTransactions.length} transactions...`);

      // Group by wallet_address and market_slug
      const summaries: { [key: string]: any } = {};

      allTransactions.forEach((tx: any) => {
        const key = `${tx.wallet_address}:${tx.market_slug}`;
        if (!summaries[key]) {
          summaries[key] = {
            wallet_address: tx.wallet_address,
            market_slug: tx.market_slug,
            total_volume_buy: 0,
            total_volume_sell: 0,
            total_volume: 0,
            total_interactions: 0,
            net_shares: 0,
            first_interaction: tx.timestamp,
            last_interaction: tx.timestamp,
          };
        }

        const summary = summaries[key];
        const volume = parseFloat(tx.volume_usd) || 0;
        const shares = parseFloat(tx.shares_normalized) || 0;

        if (tx.side === 'BUY') {
          summary.total_volume_buy += volume;
          summary.net_shares += shares;
        } else {
          summary.total_volume_sell += volume;
          summary.net_shares -= shares;
        }

        summary.total_volume += volume;
        summary.total_interactions += 1;

        if (new Date(tx.timestamp) < new Date(summary.first_interaction)) {
          summary.first_interaction = tx.timestamp;
        }
        if (new Date(tx.timestamp) > new Date(summary.last_interaction)) {
          summary.last_interaction = tx.timestamp;
        }
      });

      console.log(`Created ${Object.keys(summaries).length} market summaries.`);

      // Insert in batches
      const summaryArray = Object.values(summaries);
      const batchSize = 100;
      let inserted = 0;

      for (let i = 0; i < summaryArray.length; i += batchSize) {
        const batch = summaryArray.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from('wallet_market_summary')
          .upsert(batch, {
            onConflict: 'wallet_address,market_slug',
          });

        if (insertError) {
          console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, insertError.message);
        } else {
          inserted += batch.length;
          console.log(`  Inserted ${inserted}/${summaryArray.length} summaries...`);
        }
      }

      console.log(`\n✓ Populated ${inserted} market summaries.`);
    } else {
      console.log('✓ Market summaries populated via function.');
    }

    console.log('\n=== Market Summary Population Complete! ===');
  } catch (error: any) {
    console.error('Error during market summary population:', error.message || error);
  } finally {
    await app.close();
  }
}

populateMarketSummaries();

