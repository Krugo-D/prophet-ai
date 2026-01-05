import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { DomeapiModule } from './domeapi/domeapi.module';
import { MarketsModule } from './markets/markets.module';
import { PnlModule } from './pnl/pnl.module';
import { WalletProfileModule } from './wallet-profile/wallet-profile.module';
import { WalletTransactionsModule } from './wallet-transactions/wallet-transactions.module';
import { MlModule } from './ml/ml.module';
import { B2BModule } from './b2b/b2b.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '../.env',
    }),
    DatabaseModule,
    DomeapiModule,
    WalletTransactionsModule,
    WalletProfileModule,
    PnlModule,
    MarketsModule,
    MlModule,
    B2BModule,
  ],
})
export class AppModule {}

