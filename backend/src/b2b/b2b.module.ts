import { Module } from '@nestjs/common';
import { B2BController } from './b2b.controller';
import { B2BService } from './b2b.service';
import { DatabaseModule } from '../database/database.module';
import { MlModule } from '../ml/ml.module';

@Module({
  imports: [DatabaseModule, MlModule],
  controllers: [B2BController],
  providers: [B2BService],
})
export class B2BModule {}
