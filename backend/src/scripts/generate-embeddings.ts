import { NestFactory } from '@nestjs/core';
import 'reflect-metadata';
import { AppModule } from '../app.module';
import { EmbeddingService } from '../ml/embedding.service';
import { SupabaseService } from '../database/supabase.service';

async function generateEmbeddings() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const embeddingService = app.get(EmbeddingService);
  const supabaseService = app.get(SupabaseService);
  const supabase = supabaseService.getClient();

  console.log('=== Generating Pure ML Market Embeddings ===');
  console.log('Strategy: Strictly Title-Based Semantic Extraction (Zero Human Bias)');

  // Fetch markets that need embeddings
  const { data: markets, error } = await supabase
    .from('markets')
    .select('market_slug, title')
    .is('embedding', null);

  if (error) {
    console.error('Error fetching markets:', error);
    await app.close();
    return;
  }

  console.log(`Found ${markets.length} markets to process`);

  for (let i = 0; i < markets.length; i++) {
    const market = markets[i];
    console.log(`[${i + 1}/${markets.length}] Processing ${market.market_slug}...`);

    try {
      // PURE ML: We only embed the Title.
      // We ignore human-generated tags and categories to ensure the 
      // mathematical model finds its own semantic relationships.
      const textToEmbed = market.title;
      
      const vector = await embeddingService.getEmbedding(textToEmbed);

      // Update the database
      const { error: updateError } = await supabase
        .from('markets')
        .update({ embedding: vector as any })
        .eq('market_slug', market.market_slug);

      if (updateError) {
        throw new Error(`DB Update failed: ${updateError.message}`);
      }

      console.log(`  Success! (Hardcore Semantic DNA generated)`);
    } catch (err: any) {
      console.error(`  Error processing ${market.market_slug}:`, err.message);
    }
  }

  console.log('\n=== Pure Embedding Generation Complete! ===');
  await app.close();
}

generateEmbeddings();
