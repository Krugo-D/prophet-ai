import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { WalletInteractionsService } from './wallet-interactions.service';

@Module({
  imports: [DatabaseModule],
  providers: [WalletInteractionsService],
  exports: [WalletInteractionsService],
})
export class WalletInteractionsModule {}


