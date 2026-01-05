import { NestFactory } from '@nestjs/core';
import 'reflect-metadata';
import { AppModule } from '../app.module';
import { EmbeddingService } from '../ml/embedding.service';

async function testGoogleConnection() {
  console.log('=== Testing Google Vertex AI Connection ===');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const embeddingService = app.get(EmbeddingService);

  try {
    const testText = "Prophet prediction markets are the future.";
    console.log(`Sending test text: "${testText}"`);
    
    const vector = await embeddingService.getEmbedding(testText);
    
    if (vector && vector.length === 768) {
      console.log('✅ SUCCESS! Received 768-dimensional vector from Google.');
      console.log('First 5 values:', vector.slice(0, 5));
    } else {
      console.log('❌ FAILED: Received unexpected response format.');
      console.log('Vector:', vector);
    }
  } catch (error: any) {
    console.log('❌ CONNECTION FAILED');
    if (error.message?.includes('403') || error.message?.includes('PERMISSION_DENIED')) {
      console.error('Error: Permission Denied. Make sure Vertex AI API is enabled and your API Key has the right permissions.');
    } else if (error.message?.includes('404') || error.message?.includes('NOT_FOUND')) {
      console.error('Error: Not Found. Check your GOOGLE_PROJECT_ID and GOOGLE_LOCATION.');
    } else {
      console.error('Error details:', error.message || error);
    }
  } finally {
    await app.close();
  }
}

testGoogleConnection();
