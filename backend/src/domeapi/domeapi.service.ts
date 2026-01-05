import { DomeClient } from '@dome-api/sdk';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DomeapiService {
  private client: DomeClient;

  constructor(@Optional() @Inject(ConfigService) private configService?: ConfigService) {
    const apiKey = this.configService?.get<string>('domeapi.apiKey') || process.env.DOME_API_KEY;
    
    if (!apiKey) {
      throw new Error('DomeAPI key must be provided');
    }

    this.client = new DomeClient({
      apiKey: apiKey,
    });
  }

  async getMarkets(marketSlugs?: string[] | {
    marketSlugs?: string[];
    market_slug?: string[];
    minVolume?: number;
    min_volume?: number;
    limit?: number;
    offset?: number;
  }, params?: {
    marketSlugs?: string[];
    market_slug?: string[];
    minVolume?: number;
    min_volume?: number;
    limit?: number;
    offset?: number;
  }) {
    // Support both old signature (array) and new signature (object)
    if (Array.isArray(marketSlugs)) {
      return this.client.polymarket.markets.getMarkets({
        market_slug: marketSlugs,
        limit: 100,
      });
    }
    
    const config = marketSlugs || params || {};
    return this.client.polymarket.markets.getMarkets({
      market_slug: config.marketSlugs || config.market_slug,
      min_volume: config.minVolume || config.min_volume,
      limit: config.limit || 100,
      offset: config.offset || 0,
    });
  }

  async getOrders(params: {
    marketSlug?: string;
    user?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    return this.client.polymarket.orders.getOrders({
      market_slug: params.marketSlug,
      user: params.user,
      limit: params.limit || 100,
      offset: params.offset || 0,
    });
  }

  async getAllOrdersForMarket(marketSlug: string, maxResults: number = 1000) {
    let allOrders = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    while (hasMore && allOrders.length < maxResults) {
      try {
        if (offset > 0) {
          await delay(1100); // Rate limit: 1 req/sec
        }

        const response = await this.getOrders({
          marketSlug,
          limit,
          offset,
        });

        if (response.orders && response.orders.length > 0) {
          allOrders = allOrders.concat(response.orders);
          offset += limit;
          hasMore = response.pagination?.has_more || false;

          if (allOrders.length >= maxResults) {
            allOrders = allOrders.slice(0, maxResults);
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      } catch (error: any) {
        if (error.message?.includes('Rate Limit')) {
          console.log(`  Rate limit hit at offset ${offset}, waiting 2 seconds...`);
          await delay(2000);
          continue;
        }
        console.error(`Error fetching orders at offset ${offset}:`, error.message || error);
        hasMore = false;
      }
    }

    return allOrders;
  }

  async getAllOrdersForWallet(walletAddress: string, maxResults: number = 1000) {
    let allOrders = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    while (hasMore && allOrders.length < maxResults) {
      try {
        if (offset > 0) {
          await delay(1100); // Rate limit: 1 req/sec
        }

        const response = await this.getOrders({
          user: walletAddress,
          limit,
          offset,
        });

        if (response.orders && response.orders.length > 0) {
          allOrders = allOrders.concat(response.orders);
          offset += limit;
          hasMore = response.pagination?.has_more || false;

          if (allOrders.length >= maxResults) {
            allOrders = allOrders.slice(0, maxResults);
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      } catch (error: any) {
        if (error.message?.includes('Rate Limit')) {
          console.log(`  Rate limit hit at offset ${offset}, waiting 2 seconds...`);
          await delay(2000);
          continue;
        }
        console.error(`Error fetching wallet orders at offset ${offset}:`, error.message || error);
        hasMore = false;
      }
    }

    return allOrders;
  }

  async getWalletActivity(walletAddress: string, limit: number = 100, offset: number = 0) {
    try {
      const response = await this.client.polymarket.orders.getActivity({
        user: walletAddress,
        limit,
        offset,
      });
      return response;
    } catch (error) {
      console.error('Error fetching wallet activity:', error);
      throw error;
    }
  }

  async getMarketPrice(tokenId: string) {
    try {
      return await this.client.polymarket.markets.getMarketPrice({
        token_id: tokenId,
      });
    } catch (error) {
      console.error(`Error fetching price for token ${tokenId}:`, error);
      return null;
    }
  }

  async getAllWalletActivity(walletAddress: string, maxResults: number = 1000) {
    let allActivities = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    // Helper function to delay execution (respect rate limits: 1 req/sec for free tier)
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    while (hasMore && allActivities.length < maxResults) {
      try {
        // Add delay to respect rate limits (1 request per second)
        if (offset > 0) {
          await delay(1100); // Slightly more than 1 second to be safe
        }

        const response = await this.client.polymarket.orders.getActivity({
          user: walletAddress,
          limit,
          offset,
        });
        
        if (response.activities && response.activities.length > 0) {
          allActivities = allActivities.concat(response.activities);
          offset += limit;
          hasMore = response.pagination?.has_more || false;
          
          // Stop if we've reached max results
          if (allActivities.length >= maxResults) {
            allActivities = allActivities.slice(0, maxResults);
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      } catch (error: any) {
        if (error.message?.includes('Rate Limit')) {
          console.log(`  Rate limit hit at offset ${offset}, waiting 2 seconds...`);
          await delay(2000);
          // Retry once
          continue;
        }
        console.error(`Error fetching wallet activity at offset ${offset}:`, error.message || error);
        hasMore = false;
      }
    }

    return allActivities;
  }

  getClient(): DomeClient {
    return this.client;
  }
}

