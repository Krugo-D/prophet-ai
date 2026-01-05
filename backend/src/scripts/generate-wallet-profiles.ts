import { NestFactory } from '@nestjs/core';
import 'reflect-metadata';
import { AppModule } from '../app.module';
import { SupabaseService } from '../database/supabase.service';

async function generateWalletProfiles() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const supabaseService = app.get(SupabaseService);
  const supabase = supabaseService.getClient();

  console.log('=== Generating Wallet Interest Profiles ===');

  // Fetch ALL market summaries using pagination to bypass the 1000-row limit
  const allSummaries: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  console.log('Fetching market summaries...');
  while (hasMore) {
    const { data, error } = await supabase
      .from('wallet_market_summary')
      .select('wallet_address, market_slug, total_volume')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('Error fetching summaries:', error);
      break;
    }

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allSummaries.push(...data);
      console.log(`  Fetched ${allSummaries.length} summaries...`);
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    }
  }

  const wallets = [...new Set(allSummaries.map(s => s.wallet_address))];
  console.log(`Processing ${wallets.length} unique wallets`);

  for (let i = 0; i < wallets.length; i++) {
    const walletAddress = wallets[i];
    console.log(`[${i + 1}/${wallets.length}] Processing wallet: ${walletAddress}`);

    try {
      const userSummaries = allSummaries.filter(s => s.wallet_address === walletAddress);
      const slugs = userSummaries.map(s => s.market_slug);

      // Fetch embeddings for these markets
      const { data: markets, error: marketError } = await supabase
        .from('markets')
        .select('market_slug, embedding')
        .in('market_slug', slugs)
        .not('embedding', 'is', null);

      if (marketError || !markets || markets.length === 0) {
        console.log(`  No markets with embeddings found. Skipping.`);
        continue;
      }

      // Calculate weighted average
      const dimensions = 768;
      const weightedVector = new Array(dimensions).fill(0);
      let totalWeight = 0;

      for (const summary of userSummaries) {
        const market = markets.find(m => m.market_slug === summary.market_slug);
        if (market && market.embedding) {
          const volume = parseFloat(summary.total_volume || '0');
          // Aggressive convinction-based weighting: sqrt(vol) gives high-volume trades much more pull
          const weight = Math.sqrt(volume) / 5 + Math.log10(volume + 1) + 1;
          let vector: number[];
          
          if (typeof market.embedding === 'string') {
            const clean = (market.embedding as string).replace(/[\[\]]/g, '');
            vector = clean.split(',').map(v => parseFloat(v));
          } else {
            vector = (market.embedding as unknown) as number[];
          }
          
          if (vector && vector.length === dimensions) {
            for (let d = 0; d < dimensions; d++) {
              if (typeof vector[d] === 'number' && !isNaN(vector[d])) {
                weightedVector[d] += vector[d] * weight;
              }
            }
            totalWeight += weight;
          }
        }
      }

      if (totalWeight > 0) {
        const finalVector = weightedVector.map(v => v / totalWeight);

        const { error: upsertError } = await supabase
          .from('wallet_interest_profiles')
          .upsert({
            wallet_address: walletAddress,
            interest_vector: finalVector as any,
            last_updated: new Date().toISOString(),
          });

        if (upsertError) {
          throw new Error(`DB Upsert failed: ${upsertError.message}`);
        }

        console.log(`  Success! (Based on ${markets.length} markets)`);
      } else {
        console.log(`  Total weight was zero. Skipping.`);
      }
    } catch (err: any) {
      console.error(`  Error processing ${walletAddress}:`, err.message);
    }
  }

  console.log('\n=== Wallet Profile Generation Complete! ===');
  await app.close();
}

generateWalletProfiles();
