import { NestFactory } from '@nestjs/core';
import 'reflect-metadata';
import { AppModule } from '../app.module';
import { SupabaseService } from '../database/supabase.service';

function getCategoryFromTags(tags: string[]): string {
  if (!tags || tags.length === 0) return 'Uncategorized';

  const categoryKeywords: { [key: string]: string } = {
    'Politics': 'Politics',
    'Political': 'Politics',
    'Election': 'Politics',
    'Sports': 'Sports',
    'Sport': 'Sports',
    'Crypto': 'Crypto',
    'Cryptocurrency': 'Crypto',
    'Bitcoin': 'Crypto',
    'Ethereum': 'Crypto',
    'Entertainment': 'Entertainment',
    'Movie': 'Entertainment',
    'TV': 'Entertainment',
    'Economics': 'Economics',
    'Economic': 'Economics',
    'Finance': 'Economics',
    'Financial': 'Economics',
    'Tech': 'Tech',
    'Technology': 'Tech',
    'AI': 'AI',
    'OpenAI': 'AI',
    'Science': 'Science',
    'Health': 'Health',
    'Culture': 'Culture',
    'Music': 'Music',
    'Business': 'Business',
    'Economy': 'Economics',
    'Big Tech': 'Big Tech',
    'Elon Musk': 'Elon Musk',
    'Gov Shutdown': 'Politics',
    'Rewards': 'Rewards',
    'France': 'Politics',
    'Earnings': 'Economics',
  };

  for (const tag of tags) {
    for (const [keyword, category] of Object.entries(categoryKeywords)) {
      if (tag.toLowerCase().includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }

  return tags[0] || 'Uncategorized';
}

async function updateMarketCategories() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const supabaseService = app.get(SupabaseService);
  const supabase = supabaseService.getClient();

  console.log('=== Updating Market Categories ===\n');

  try {
    // Get all markets with tags but null category
    const { data: markets, error: marketsError } = await supabase
      .from('markets')
      .select('market_slug, tags, category')
      .is('category', null);

    if (marketsError) {
      throw new Error(`Failed to fetch markets: ${marketsError.message}`);
    }

    if (!markets || markets.length === 0) {
      console.log('No markets with null categories found.');
      await app.close();
      return;
    }

    console.log(`Found ${markets.length} markets to update.`);

    let updated = 0;
    for (const market of markets) {
      const category = getCategoryFromTags(market.tags || []);
      
      const { error: updateError } = await supabase
        .from('markets')
        .update({ category })
        .eq('market_slug', market.market_slug);

      if (updateError) {
        console.error(`Error updating ${market.market_slug}: ${updateError.message}`);
      } else {
        updated++;
        if (updated % 100 === 0) {
          console.log(`  Updated ${updated}/${markets.length} markets...`);
        }
      }
    }

    console.log(`\n✓ Updated ${updated} market categories.`);
    console.log('\n=== Market Category Update Complete! ===');
    console.log('\nNote: Run "yarn refresh-categories" to update category summaries.');
  } catch (error: any) {
    console.error('Error during category update:', error.message || error);
  } finally {
    await app.close();
  }
}

updateMarketCategories();

