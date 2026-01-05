import { Controller, Post, Body, Inject } from '@nestjs/common';
import { B2BService } from './b2b.service';
import { RankMarketsDto } from './dto/rank-markets.dto';

@Controller('b2b')
export class B2BController {
  constructor(@Inject(B2BService) private readonly b2bService: B2BService) {}

  @Post('rank')
  async rankMarkets(@Body() dto: RankMarketsDto) {
    return this.b2bService.rankMarkets(dto);
  }
}
