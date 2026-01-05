import { NestFactory } from '@nestjs/core';
import 'reflect-metadata';
import { AppModule } from '../app.module';
import { DomeapiService } from '../domeapi/domeapi.service';

async function listDomeMethods() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const domeapiService = app.get(DomeapiService);
  const client = domeapiService.getClient();

  console.log('--- DOME SDK STRUCTURE ---');
  console.log('Polymarket methods:', Object.keys(client.polymarket));
  if (client.polymarket.markets) {
    console.log('Markets methods:', Object.keys(client.polymarket.markets));
  }
  if (client.polymarket.orders) {
    console.log('Orders methods:', Object.keys(client.polymarket.orders));
  }
  // Check if there's a clob or price related section
  if ((client as any).polymarket.clob) {
    console.log('CLOB methods:', Object.keys((client as any).polymarket.clob));
  }
  console.log('--- END SDK STRUCTURE ---');

  await app.close();
}

listDomeMethods();
