import { NestFactory } from '@nestjs/core';
import 'reflect-metadata';
import { AppModule } from '../app.module';
import { DomeapiService } from '../domeapi/domeapi.service';
import { WalletInteractionsService } from '../wallet-interactions/wallet-interactions.service';

// POC Configuration - adjust these for testing
const POC_CONFIG = {
  // Number of top markets to start with
  NUM_MARKETS: 3,
  // Maximum orders to fetch per market
  MAX_ORDERS_PER_MARKET: 100,
  // Maximum activities to fetch per wallet
  MAX_ACTIVITIES_PER_WALLET: 100,
};

// Map Polymarket tags to categories
function getCategoryFromTags(tags: string[]): string {
  if (!tags || tags.length === 0) return 'Uncategorized';

  const categoryKeywords: { [key: string]: string } = {
    'Politics': 'Politics',
    'Political': 'Politics',
    'Election': 'Politics',
    'Sports': 'Sports',
    'Sport': 'Sports',
    'Crypto': 'Crypto',
    'Cryptocurrency': 'Crypto',
    'Bitcoin': 'Crypto',
    'Ethereum': 'Crypto',
    'Entertainment': 'Entertainment',
    'Movie': 'Entertainment',
    'TV': 'Entertainment',
    'Economics': 'Economics',
    'Economic': 'Economics',
    'Finance': 'Economics',
    'Financial': 'Economics',
  };

  for (const tag of tags) {
    for (const [keyword, category] of Object.entries(categoryKeywords)) {
      if (tag.toLowerCase().includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }

  return tags[0] || 'Uncategorized';
}

async function populateFromMarkets() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const domeapiService = app.get(DomeapiService);
  const walletInteractionsService = app.get(WalletInteractionsService);

  console.log('=== Phase 1: Market-First Wallet Discovery ===');
  console.log(`Configuration: ${POC_CONFIG.NUM_MARKETS} markets, max ${POC_CONFIG.MAX_ORDERS_PER_MARKET} orders/market, max ${POC_CONFIG.MAX_ACTIVITIES_PER_WALLET} activities/wallet\n`);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  try {
    // Step 1: Fetch top markets by volume
    console.log('Step 1: Fetching top markets by volume...');
    const marketsResponse = await domeapiService.getMarkets({
      minVolume: 1000, // Minimum volume to ensure active markets
      limit: POC_CONFIG.NUM_MARKETS,
    });

    const markets = marketsResponse.markets || [];
    console.log(`  Found ${markets.length} markets\n`);

    if (markets.length === 0) {
      console.log('No markets found. Exiting.');
      await app.close();
      return;
    }

    // Step 2: For each market, get orders and discover wallets
    console.log('Step 2: Discovering wallets from market orders...');
    const discoveredWallets = new Set<string>();
    const marketCache = new Map<string, any>();

    // Cache market details
    markets.forEach(market => {
      marketCache.set(market.market_slug, market);
    });

    for (let i = 0; i < markets.length; i++) {
      const market = markets[i];
      console.log(`  [${i + 1}/${markets.length}] Processing market: ${market.market_slug}`);
      console.log(`    Title: ${market.title}`);

      try {
        // Add delay between market requests
        if (i > 0) {
          await delay(1100);
        }

        const orders = await domeapiService.getAllOrdersForMarket(
          market.market_slug,
          POC_CONFIG.MAX_ORDERS_PER_MARKET
        );

        // Extract unique wallets from orders
        const walletsInMarket = new Set<string>();
        orders.forEach(order => {
          if (order.user) {
            walletsInMarket.add(order.user.toLowerCase());
            discoveredWallets.add(order.user.toLowerCase());
          }
        });

        console.log(`    Found ${orders.length} orders`);
        console.log(`    Discovered ${walletsInMarket.size} unique wallets (${discoveredWallets.size} total unique wallets so far)`);
      } catch (error: any) {
        console.error(`    Error processing market ${market.market_slug}:`, error.message || error);
      }
    }

    console.log(`\n  Total unique wallets discovered: ${discoveredWallets.size}\n`);

    if (discoveredWallets.size === 0) {
      console.log('No wallets discovered. Exiting.');
      await app.close();
      return;
    }

    // Step 3: Fetch market details for any markets we haven't cached yet
    console.log('Step 3: Fetching additional market details...');
    // (We'll fetch market details on-demand when processing activities)

    // Step 4: For each discovered wallet, fetch full activity
    console.log('Step 4: Fetching wallet activities...');
    const allInteractions = [];
    const walletsArray = Array.from(discoveredWallets);

    for (let i = 0; i < walletsArray.length; i++) {
      const walletAddress = walletsArray[i];
      console.log(`  [${i + 1}/${walletsArray.length}] Processing wallet: ${walletAddress}`);

      try {
        // Add delay between wallet requests
        if (i > 0) {
          await delay(1100);
        }

        const activities = await domeapiService.getAllWalletActivity(
          walletAddress,
          POC_CONFIG.MAX_ACTIVITIES_PER_WALLET
        );

        console.log(`    Found ${activities.length} activities`);

        // Get unique market slugs from activities
        const uniqueMarketSlugs = [...new Set(activities.map(a => a.market_slug).filter(Boolean))];
        const uncachedMarkets = uniqueMarketSlugs.filter(slug => !marketCache.has(slug));

        // Fetch market details for uncached markets
        if (uncachedMarkets.length > 0) {
          console.log(`    Fetching details for ${uncachedMarkets.length} new markets...`);
          for (let j = 0; j < uncachedMarkets.length; j++) {
            const marketSlug = uncachedMarkets[j];
            try {
              if (j > 0) {
                await delay(1100);
              }
              const marketResponse = await domeapiService.getMarkets({
                marketSlugs: [marketSlug],
                limit: 1,
              });
              if (marketResponse.markets && marketResponse.markets.length > 0) {
                marketCache.set(marketSlug, marketResponse.markets[0]);
              }
            } catch (error: any) {
              console.error(`      Error fetching market ${marketSlug}:`, error.message);
            }
          }
        }

        // Map activities to interactions
        for (const activity of activities) {
          const market = marketCache.get(activity.market_slug);
          const category = market?.tags ? getCategoryFromTags(market.tags) : 'Uncategorized';

          allInteractions.push({
            wallet_address: walletAddress,
            market_slug: activity.market_slug || 'unknown',
            market_title: activity.title || market?.title || 'Unknown Market',
            category: category,
            interaction_type: activity.side || 'UNKNOWN',
            amount: activity.shares_normalized || activity.shares || 0,
            timestamp: new Date(activity.timestamp * 1000),
          });
        }

        console.log(`    Mapped ${activities.length} activities to interactions`);
      } catch (error: any) {
        console.error(`    Error processing wallet ${walletAddress}:`, error.message || error);
      }
    }

    console.log(`\nTotal interactions to store: ${allInteractions.length}`);

    if (allInteractions.length === 0) {
      console.log('No interactions found. Exiting.');
      await app.close();
      return;
    }

    // Step 5: Store interactions in batches
    console.log('\nStep 5: Storing interactions in database...');
    const batchSize = 100;
    for (let i = 0; i < allInteractions.length; i += batchSize) {
      const batch = allInteractions.slice(i, i + batchSize);
      try {
        await walletInteractionsService.storeInteractions(batch);
        console.log(`  Stored batch ${Math.floor(i / batchSize) + 1} (${batch.length} interactions)`);
      } catch (error: any) {
        console.error(`  Error storing batch ${Math.floor(i / batchSize) + 1}:`, error.message || error);
      }
    }

    console.log('\n=== Population Complete! ===');
    console.log(`Markets processed: ${markets.length}`);
    console.log(`Wallets discovered: ${discoveredWallets.size}`);
    console.log(`Total interactions stored: ${allInteractions.length}`);
  } catch (error) {
    console.error('Error populating wallet data:', error);
  } finally {
    await app.close();
  }
}

populateFromMarkets();

