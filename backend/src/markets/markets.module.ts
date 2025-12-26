import { Module } from '@nestjs/common';
import { MarketsController } from './markets.controller';
import { MarketsService } from './markets.service';
import { DomeapiModule } from '../domeapi/domeapi.module';

@Module({
  imports: [DomeapiModule],
  controllers: [MarketsController],
  providers: [MarketsService],
})
export class MarketsModule {}

