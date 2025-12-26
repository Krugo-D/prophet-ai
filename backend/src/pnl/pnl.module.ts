import { Module } from '@nestjs/common';
import { PnlService } from './pnl.service';
import { DatabaseModule } from '../database/database.module';
import { DomeapiModule } from '../domeapi/domeapi.module';

@Module({
  imports: [DatabaseModule, DomeapiModule],
  providers: [PnlService],
  exports: [PnlService],
})
export class PnlModule {}


