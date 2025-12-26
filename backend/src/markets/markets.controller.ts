import { Controller, Get, Query } from '@nestjs/common';
import { MarketsService } from './markets.service';

@Controller('markets')
export class MarketsController {
  constructor(private readonly marketsService: MarketsService) {}

  @Get()
  async getMarkets(
    @Query('category') category?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('min_volume') minVolume?: string,
    @Query('status') status?: string,
  ) {
    return this.marketsService.getMarkets({
      category,
      limit: limit ? parseInt(limit, 10) : 100,
      offset: offset ? parseInt(offset, 10) : 0,
      min_volume: minVolume ? parseFloat(minVolume) : undefined,
      status: status as 'open' | 'closed' | undefined,
    });
  }
}

