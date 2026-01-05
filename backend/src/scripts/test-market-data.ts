import { NestFactory } from '@nestjs/core';
import 'reflect-metadata';
import { AppModule } from '../app.module';
import { DomeapiService } from '../domeapi/domeapi.service';

async function testMarketData() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const domeapiService = app.get(DomeapiService);

  try {
    const marketResponse = await domeapiService.getMarkets({
      limit: 10, // Get a few more to be sure
    });
    
    const market = marketResponse.markets[0];
    console.log('--- ALL KEYS ---');
    console.log(Object.keys(market));
    console.log('--- VALUES ---');
    console.log(JSON.stringify(market, null, 2));
    
  } catch (error) {
    console.error('Error fetching market data:', error);
  } finally {
    await app.close();
  }
}

testMarketData();
