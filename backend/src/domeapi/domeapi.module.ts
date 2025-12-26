import { Module } from '@nestjs/common';
import { DomeapiService } from './domeapi.service';

@Module({
  providers: [DomeapiService],
  exports: [DomeapiService],
})
export class DomeapiModule {}


