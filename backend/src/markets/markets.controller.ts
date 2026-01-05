import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { MarketsService, MarketRecommendation } from './markets.service';

@Controller('markets')
export class MarketsController {
  constructor(@Inject(MarketsService) private readonly marketsService: MarketsService) {}

  @Get('recommendations/:walletAddress')
  async getRecommendations(
    @Param('walletAddress') walletAddress: string,
    @Query('limit') limit?: string,
  ): Promise<{ recommendations: MarketRecommendation[] }> {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const recommendations = await this.marketsService.getRecommendations(walletAddress, limitNum);
    return { recommendations };
  }

  @Get('by-slugs')
  async getBySlugs(
    @Query('slugs') slugs: string,
  ): Promise<{ markets: MarketRecommendation[] }> {
    if (!slugs) return { markets: [] };
    const slugList = slugs.split(',');
    const markets = await this.marketsService.getMarketsBySlugs(slugList);
    return { markets };
  }
}
