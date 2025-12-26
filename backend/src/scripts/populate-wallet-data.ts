import { NestFactory } from '@nestjs/core';
import 'reflect-metadata';
import { AppModule } from '../app.module';
import { DomeapiService } from '../domeapi/domeapi.service';
import { WalletInteractionsService } from '../wallet-interactions/wallet-interactions.service';

// Known Polymarket wallet addresses - you can add more here
const WALLET_ADDRESSES = [
  '0x6031b6eed1c97e853c6e0f03ad3ce3529351f96d', // Example wallet with activity
  // Add more wallet addresses here
];

// Map Polymarket tags to categories
function getCategoryFromTags(tags: string[]): string {
  if (!tags || tags.length === 0) return 'Uncategorized';
  
  // Priority order for category detection
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

  // Check tags for category keywords
  for (const tag of tags) {
    for (const [keyword, category] of Object.entries(categoryKeywords)) {
      if (tag.toLowerCase().includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }

  // Default to first tag or Uncategorized
  return tags[0] || 'Uncategorized';
}

async function populateWalletData() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const domeapiService = app.get(DomeapiService);
  const walletInteractionsService = app.get(WalletInteractionsService);

  console.log('Starting to populate wallet data from DomeAPI...');
  console.log(`Processing ${WALLET_ADDRESSES.length} wallet(s)...`);

  try {
    const allInteractions = [];
    const marketCache = new Map<string, any>();

    for (const walletAddress of WALLET_ADDRESSES) {
      console.log(`\nFetching activity for wallet: ${walletAddress}`);
      
      try {
        // Fetch all activity for this wallet (limit to 1000 for POC to avoid rate limits)
        const activities = await domeapiService.getAllWalletActivity(walletAddress, 1000);
        console.log(`  Found ${activities.length} activities`);

        // Get unique market slugs to fetch market details
        const uniqueMarketSlugs = [...new Set(activities.map(a => a.market_slug).filter(Boolean))];
        console.log(`  Fetching details for ${uniqueMarketSlugs.length} unique markets...`);

        // Fetch market details in batches with rate limiting
        const batchSize = 1; // Fetch one at a time to respect rate limits
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        
        for (let i = 0; i < uniqueMarketSlugs.length; i += batchSize) {
          const batch = uniqueMarketSlugs.slice(i, i + batchSize);
          try {
            // Add delay between requests (1 request per second)
            if (i > 0) {
              await delay(1100);
            }
            
            const marketsResponse = await domeapiService.getMarkets(batch);
            if (marketsResponse.markets) {
              marketsResponse.markets.forEach(market => {
                if (market.market_slug) {
                  marketCache.set(market.market_slug, market);
                }
              });
            }
            
            if ((i + batchSize) % 10 === 0) {
              console.log(`  Fetched ${Math.min(i + batchSize, uniqueMarketSlugs.length)}/${uniqueMarketSlugs.length} markets...`);
            }
          } catch (error: any) {
            if (error.message?.includes('Rate Limit')) {
              console.log(`  Rate limit hit, waiting 2 seconds...`);
              await delay(2000);
              i -= batchSize; // Retry this batch
              continue;
            }
            console.error(`  Error fetching markets batch ${Math.floor(i / batchSize) + 1}:`, error.message || error);
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
            interaction_type: activity.side || 'UNKNOWN', // REDEEM, MERGE, SPLIT, etc.
            amount: activity.shares_normalized || activity.shares || 0,
            timestamp: new Date(activity.timestamp * 1000), // Convert Unix timestamp to Date
          });
        }

        console.log(`  Mapped ${activities.length} activities to interactions`);
      } catch (error) {
        console.error(`  Error processing wallet ${walletAddress}:`, error.message);
      }
    }

    console.log(`\nTotal interactions to store: ${allInteractions.length}`);
    
    if (allInteractions.length === 0) {
      console.log('No interactions found. Exiting.');
      await app.close();
      return;
    }

    // Store interactions in batches
    const batchSize = 100;
    for (let i = 0; i < allInteractions.length; i += batchSize) {
      const batch = allInteractions.slice(i, i + batchSize);
      try {
        await walletInteractionsService.storeInteractions(batch);
        console.log(`Stored batch ${Math.floor(i / batchSize) + 1} (${batch.length} interactions)`);
      } catch (error) {
        console.error(`Error storing batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      }
    }

    console.log('\nPopulation complete!');
    console.log(`Total interactions stored: ${allInteractions.length}`);
  } catch (error) {
    console.error('Error populating wallet data:', error);
  } finally {
    await app.close();
  }
}

populateWalletData();

