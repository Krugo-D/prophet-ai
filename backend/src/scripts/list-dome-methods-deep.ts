import { NestFactory } from '@nestjs/core';
import 'reflect-metadata';
import { AppModule } from '../app.module';
import { DomeapiService } from '../domeapi/domeapi.service';

async function listAllDomeMethods() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const domeapiService = app.get(DomeapiService);
  const client = domeapiService.getClient();

  function getMethods(obj: any, path = 'client') {
    if (!obj || typeof obj !== 'object') return;
    
    const props = Object.getOwnPropertyNames(obj);
    console.log(`${path}:`, props.filter(p => typeof obj[p] === 'function'));
    
    props.forEach(p => {
      if (typeof obj[p] === 'object' && obj[p] !== null && !Array.isArray(obj[p])) {
        getMethods(obj[p], `${path}.${p}`);
      }
    });
  }

  getMethods(client);

  await app.close();
}

listAllDomeMethods();
