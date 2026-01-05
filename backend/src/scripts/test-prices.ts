import { NestFactory } from '@nestjs/core';
import 'reflect-metadata';
import { AppModule } from '../app.module';
import { DomeapiService } from '../domeapi/domeapi.service';

async function testPrices() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const domeapiService = app.get(DomeapiService);
  const client = domeapiService.getClient();

  try {
    const marketSlug = 'nba-por-okc-2025-12-31-total-232pt5';
    console.log(`Fetching prices for ${marketSlug}...`);
    
    // Try different variations of price fetching if getPrices doesn't exist
    if ((client.polymarket.markets as any).getPrices) {
      const prices = await (client.polymarket.markets as any).getPrices({ market_slug: [marketSlug] });
      console.log('Prices:', JSON.stringify(prices, null, 2));
    } else {
      console.log('getPrices method not found on client.polymarket.markets');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await app.close();
  }
}

testPrices();
