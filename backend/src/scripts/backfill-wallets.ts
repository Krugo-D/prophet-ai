import { NestFactory } from '@nestjs/core';
import 'reflect-metadata';
import { AppModule } from '../app.module';
import { DomeapiService } from '../domeapi/domeapi.service';
import { WalletTransactionsService } from '../wallet-transactions/wallet-transactions.service';

// Wallets discovered from the market-first approach
const DISCOVERED_WALLETS = [
  '0x99fdf029599d38be3df351f030cef6d4733b3fc5',
  '0xea75955bda53f58a67c891289a650a8229ddc5ea',
  '0x71703b4377ab07e382ff5c9a57df188d37782d7c',
  '0xbe2bfc0d45181332811c2035b60ade2eed0f67fa',
  '0xd0e6662679d46e236449f515214a20df67c0d102',
  '0xa6f13dfcd6743c6ad09561530984326578e3ecb6',
  '0x5f43ac33e502dbe4c18f22b15afe764964a2f8ef',
  '0x2f27c44a1fdeb3c92a8ca86f6be9ffceab91c7ce',
  '0x6ee8c9108e763894fdbec7a8ff5983910f8e1257',
  '0xc323d53e05631fe3c8b5920ec928fbf85f790286',
  '0x7a82105e12c035552bba5c0cf046b9d3eacde53a',
  '0x22a9d2a18129715351bbb8f081fad758d4c21afc',
  '0xed9bbb9bf22725be4cf75f0a94d43f5f3b8041f8',
  '0x4eb85167e92a59b671478bbdaaa901551a6a9231',
  '0x3db7323ed617bf42fb22058a71aa79a3b0971456',
  '0xab433daa8ccbff769cdfb8570b8fea4df78dd9c9',
  '0x77f838c4e46244de925613ff4860807020cc569f',
  '0xb9230b4ab5388c25c5fe21147069e81a4c7a7d7b',
  '0x6e8bb2b3b316665ab9a34319c76d7c2ee68dbab7',
  '0x4258342c4397d690c63ac5dbc247673f7e9cb969',
  '0xb6e8f217e36119f58d9ac6aa444b0a6ad5bfd990',
  '0xb2d2c273da1bf554b6865f4e3eaeac7e678bf017',
  '0xf42124f7f317620b8e800801316b4d54e1c64620',
  '0x9ad909bd7977cd60161c1d0ce382402086046883',
  '0x46e5357733964753d0655b54bc027f0bc6ed3a87',
  '0x4cc3522b689a6bf1fb4a2444c523e7776db47552',
  '0xe6a65ce623ea07af3bd6c793d4c3f969e1ca936b',
  '0x4cadef3ea03cf166c33e3746f9d53a15a6e4e7eb',
  '0x8fc775fa9cb390f18515c07e271343118bb9a4bb',
];

// POC Configuration
const POC_CONFIG = {
  MAX_ORDERS_PER_WALLET: 500,
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

async function backfillWallets() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const domeapiService = app.get(DomeapiService);
  const walletTransactionsService = app.get(WalletTransactionsService);

  console.log('=== Backfilling Wallets with Trade History (New Schema) ===');
  console.log(`Processing ${DISCOVERED_WALLETS.length} wallets`);
  console.log(`Max orders per wallet: ${POC_CONFIG.MAX_ORDERS_PER_WALLET}\n`);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  const marketCache = new Map<string, any>();
  const allTransactions = [];
  const allMarkets = new Map<string, any>();

  try {
    for (let i = 0; i < DISCOVERED_WALLETS.length; i++) {
      const walletAddress = DISCOVERED_WALLETS[i].toLowerCase();
      console.log(`[${i + 1}/${DISCOVERED_WALLETS.length}] Processing wallet: ${walletAddress}`);

      try {
        if (i > 0) {
          await delay(1100);
        }

        // Fetch orders (trade history) for this wallet
        const orders = await domeapiService.getAllOrdersForWallet(
          walletAddress,
          POC_CONFIG.MAX_ORDERS_PER_WALLET
        );

        console.log(`  Found ${orders.length} orders`);

        if (orders.length === 0) {
          console.log(`  No orders found, skipping...\n`);
          continue;
        }

        // Get unique market slugs from orders
        const uniqueMarketSlugs = [...new Set(orders.map(o => o.market_slug).filter(Boolean))];
        const uncachedMarkets = uniqueMarketSlugs.filter(slug => !marketCache.has(slug));

        // Fetch market details for uncached markets
        if (uncachedMarkets.length > 0) {
          console.log(`  Fetching details for ${uncachedMarkets.length} markets...`);
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
                const market = marketResponse.markets[0];
                marketCache.set(marketSlug, market);
                allMarkets.set(marketSlug, market);
              }
            } catch (error: any) {
              console.error(`    Error fetching market ${marketSlug}:`, error.message);
            }
          }
        }

        // Map orders to transactions with price and volume
        for (const order of orders) {
          const market = marketCache.get(order.market_slug);
          const category = market?.tags ? getCategoryFromTags(market.tags) : 'Uncategorized';
          
          // Calculate volume: price × shares_normalized
          const volumeUsd = (order.price || 0) * (order.shares_normalized || 0);

          allTransactions.push({
            wallet_address: walletAddress,
            market_slug: order.market_slug || 'unknown',
            side: order.side || 'BUY',
            price: order.price || 0,
            shares: order.shares || 0,
            shares_normalized: order.shares_normalized || 0,
            volume_usd: volumeUsd,
            token_id: order.token_id,
            condition_id: order.condition_id,
            tx_hash: order.tx_hash,
            order_hash: order.order_hash,
            timestamp: new Date(order.timestamp * 1000),
          });

          // Store market info for later upsert
          if (market && !allMarkets.has(order.market_slug)) {
            allMarkets.set(order.market_slug, {
              market_slug: order.market_slug,
              title: order.title || market.title,
              condition_id: market.condition_id,
              category: category,
              tags: market.tags || [],
              status: market.status || 'open',
              winning_side: market.winning_side,
              side_a_id: market.side_a?.id,
              side_b_id: market.side_b?.id,
              start_time: market.start_time,
              end_time: market.end_time,
              completed_time: market.completed_time,
              volume_total: market.volume_total,
            });
          }
        }

        console.log(`  Mapped ${orders.length} orders to transactions\n`);
      } catch (error: any) {
        console.error(`  Error processing wallet ${walletAddress}:`, error.message || error);
        console.log('');
      }
    }

    console.log(`\nTotal transactions to store: ${allTransactions.length}`);
    console.log(`Total markets to store: ${allMarkets.size}`);

    if (allTransactions.length === 0) {
      console.log('No transactions found. Exiting.');
      await app.close();
      return;
    }

    // Step 1: Store/update markets first
    console.log('\nStep 1: Storing/updating markets...');
    const marketArray = Array.from(allMarkets.values());
    for (let i = 0; i < marketArray.length; i++) {
      try {
        await walletTransactionsService.upsertMarket(marketArray[i]);
        if ((i + 1) % 10 === 0) {
          console.log(`  Stored ${i + 1}/${marketArray.length} markets...`);
        }
      } catch (error: any) {
        console.error(`  Error storing market ${marketArray[i].market_slug}:`, error.message);
      }
    }
    console.log(`  Stored ${marketArray.length} markets`);

    // Step 2: Store transactions (triggers will auto-update summaries)
    console.log('\nStep 2: Storing transactions...');
    const batchSize = 100;
    for (let i = 0; i < allTransactions.length; i += batchSize) {
      const batch = allTransactions.slice(i, i + batchSize);
      try {
        await walletTransactionsService.storeTransactions(batch);
        console.log(`  Stored batch ${Math.floor(i / batchSize) + 1} (${batch.length} transactions)`);
      } catch (error: any) {
        console.error(`  Error storing batch ${Math.floor(i / batchSize) + 1}:`, error.message || error);
      }
    }

    console.log('\n=== Backfill Complete! ===');
    console.log(`Wallets processed: ${DISCOVERED_WALLETS.length}`);
    console.log(`Markets stored: ${allMarkets.size}`);
    console.log(`Total transactions stored: ${allTransactions.length}`);
    console.log('\nNote: Summary tables (wallet_market_summary, wallet_category_summary) are auto-updated via triggers.');
  } catch (error) {
    console.error('Error backfilling wallets:', error);
  } finally {
    await app.close();
  }
}

backfillWallets();
