import { Injectable } from '@nestjs/common';
import { DomeapiService } from '../domeapi/domeapi.service';

@Injectable()
export class MarketsService {
  constructor(private readonly domeapiService: DomeapiService) {}

  async getMarkets(params: {
    category?: string;
    limit?: number;
    offset?: number;
    min_volume?: number;
    status?: 'open' | 'closed';
  }) {
    // Fetch markets from DomeAPI
    const response = await this.domeapiService.getMarkets({
      limit: params.limit || 100,
      offset: params.offset || 0,
      min_volume: params.min_volume,
    } as any);

    // Filter markets
    let markets = response.markets || [];
    
    // Filter by status if provided
    if (params.status) {
      markets = markets.filter((market) => market.status === params.status);
    }
    
    // Filter by category if provided (check tags)
    if (params.category) {
      const categoryLower = params.category.toLowerCase();
      markets = markets.filter((market) => {
        if (!market.tags || market.tags.length === 0) return false;
        return market.tags.some((tag) => tag.toLowerCase().includes(categoryLower));
      });
    }

    return {
      markets,
      pagination: response.pagination,
    };
  }
}

