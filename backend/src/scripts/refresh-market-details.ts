import { NestFactory } from '@nestjs/core';
import 'reflect-metadata';
import { AppModule } from '../app.module';
import { DomeapiService } from '../domeapi/domeapi.service';
import { WalletTransactionsService } from '../wallet-transactions/wallet-transactions.service';
import { SupabaseService } from '../database/supabase.service';

async function refreshMarketDetails() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const domeapiService = app.get(DomeapiService);
  const walletTransactionsService = app.get(WalletTransactionsService);
  const supabaseService = app.get(SupabaseService);
  const supabase = supabaseService.getClient();

  console.log('=== Refreshing Market Details (Pure Mode) ===');

  // Fetch all markets missing descriptions (or all for full sync)
  const { data: markets, error } = await supabase
    .from('markets')
    .select('market_slug, status, side_a_id, side_b_id')
    .is('description', null);

  if (error) {
    console.error('Error fetching markets:', error);
    await app.close();
    return;
  }

  console.log(`Found ${markets.length} markets to refresh`);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  for (let i = 0; i < markets.length; i++) {
    const m = markets[i];
    console.log(`[${i + 1}/${markets.length}] Refreshing ${m.market_slug}...`);

    try {
      // 1. Fetch full market info
      await delay(1100);
      const marketResponse = await domeapiService.getMarkets({
        marketSlugs: [m.market_slug],
        limit: 1,
      });

      if (!marketResponse.markets || marketResponse.markets.length === 0) {
        console.log(`  Market ${m.market_slug} not found in API`);
        continue;
      }

      const apiMarket = marketResponse.markets[0] as any;
      
      // 2. Fetch prices for outcomes
      const outcomes = [];
      if (apiMarket.side_a) {
        await delay(500);
        const priceA = await domeapiService.getMarketPrice(apiMarket.side_a.id);
        outcomes.push({
          id: apiMarket.side_a.id,
          label: apiMarket.side_a.label,
          price: priceA?.price || 0,
        });
      }

      if (apiMarket.side_b) {
        await delay(500);
        const priceB = await domeapiService.getMarketPrice(apiMarket.side_b.id);
        outcomes.push({
          id: apiMarket.side_b.id,
          label: apiMarket.side_b.label,
          price: priceB?.price || 0,
        });
      }

      // 3. Upsert into DB - keeping raw Polymarket tags/categories for context
      // but the ML will ignore them for its mathematical model
      await walletTransactionsService.upsertMarket({
        market_slug: apiMarket.market_slug,
        title: apiMarket.title,
        description: apiMarket.description,
        condition_id: apiMarket.condition_id,
        category: apiMarket.tags?.[0] || 'Uncategorized', // Use first raw tag instead of our mapping
        tags: apiMarket.tags || [],
        status: apiMarket.status || 'open',
        winning_side: apiMarket.winning_side ? JSON.stringify(apiMarket.winning_side) : null,
        side_a_id: apiMarket.side_a?.id,
        side_b_id: apiMarket.side_b?.id,
        start_time: apiMarket.start_time,
        end_time: apiMarket.end_time,
        completed_time: apiMarket.completed_time,
        volume_total: apiMarket.volume_total,
        image_url: apiMarket.image,
        outcomes: outcomes,
      });

      console.log(`  Updated ${m.market_slug} with pure data`);

    } catch (err: any) {
      console.error(`  Error updating ${m.market_slug}:`, err.message);
    }
  }

  console.log('\n=== Pure Refresh Complete! ===');
  await app.close();
}

refreshMarketDetails();
