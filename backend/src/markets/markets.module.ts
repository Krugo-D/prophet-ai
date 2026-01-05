import { Module } from '@nestjs/common';
import { MarketsController } from './markets.controller';
import { MarketsService } from './markets.service';
import { DatabaseModule } from '../database/database.module';
import { DomeapiModule } from '../domeapi/domeapi.module';

@Module({
  imports: [DatabaseModule, DomeapiModule],
  controllers: [MarketsController],
  providers: [MarketsService],
  exports: [MarketsService],
})
export class MarketsModule {}
