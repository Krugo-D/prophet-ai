import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { WalletProfileController } from './wallet-profile.controller';
import { WalletProfileService } from './wallet-profile.service';

@Module({
  imports: [DatabaseModule],
  controllers: [WalletProfileController],
  providers: [WalletProfileService],
})
export class WalletProfileModule {}

