import { NestFactory } from '@nestjs/core';
import 'reflect-metadata';
import { AppModule } from '../app.module';
import { SupabaseService } from '../database/supabase.service';

const CATEGORY_KEYWORDS: { [key: string]: string } = {
  'Politics': 'Politics',
  'Political': 'Politics',
  'Election': 'Politics',
  'Trump': 'Politics',
  'Harris': 'Politics',
  'Biden': 'Politics',
  'White House': 'Politics',
  'Senate': 'Politics',
  'House of Reps': 'Politics',
  'Congress': 'Politics',
  'Democrat': 'Politics',
  'Republican': 'Politics',
  'GOP': 'Politics',
  'Governor': 'Politics',
  'Mayor': 'Politics',
  'France': 'Politics',
  'Government': 'Politics',
  'Sports': 'Sports',
  'NFL': 'Sports',
  'NBA': 'Sports',
  'MLB': 'Sports',
  'NHL': 'Sports',
  'Soccer': 'Sports',
  'Football': 'Sports',
  'Basketball': 'Sports',
  'Baseball': 'Sports',
  'Tennis': 'Sports',
  'Golf': 'Sports',
  'Super Bowl': 'Sports',
  'Champions League': 'Sports',
  'F1': 'Sports',
  'UFC': 'Sports',
  'Crypto': 'Crypto',
  'Bitcoin': 'Crypto',
  'Ethereum': 'Crypto',
  'Solana': 'Crypto',
  'Coinbase': 'Crypto',
  'Binance': 'Crypto',
  'DeFi': 'Crypto',
  'NFT': 'Crypto',
  'Entertainment': 'Entertainment',
  'Movie': 'Entertainment',
  'TV': 'Entertainment',
  'Oscars': 'Entertainment',
  'Grammys': 'Entertainment',
  'Box Office': 'Entertainment',
  'Netflix': 'Entertainment',
  'Disney': 'Entertainment',
  'Celebrities': 'Entertainment',
  'Economics': 'Economics',
  'Inflation': 'Economics',
  'Fed ': 'Economics',
  'Interest Rates': 'Economics',
  'GDP': 'Economics',
  'Recession': 'Economics',
  'Stock Market': 'Economics',
  'Economy': 'Economics',
  'Earnings': 'Economics',
  'Finance': 'Economics',
  'Tech': 'Tech',
  'Technology': 'Tech',
  'Apple': 'Tech',
  'Google': 'Tech',
  'Meta': 'Tech',
  'Amazon': 'Tech',
  'Microsoft': 'Tech',
  'AI': 'AI',
  'OpenAI': 'AI',
  'ChatGPT': 'AI',
  'Anthropic': 'AI',
  'Science': 'Science',
  'Space': 'Science',
  'NASA': 'Science',
  'SpaceX': 'Science',
  'Health': 'Health',
  'COVID': 'Health',
  'FDA': 'Health',
  'Culture': 'Culture',
  'Business': 'Business',
  'Elon Musk': 'Elon Musk',
  'Tesla': 'Elon Musk',
  'X.com': 'Elon Musk',
  'Twitter': 'Elon Musk',
};

function determineCategory(title: string, tags: string[]): string {
  const combinedText = `${title} ${tags.join(' ')}`.toLowerCase();

  for (const [keyword, category] of Object.entries(CATEGORY_KEYWORDS)) {
    if (combinedText.includes(keyword.toLowerCase())) {
      return category;
    }
  }

  // Fallback to tags if they don't look like AI clusters
  for (const tag of tags) {
    if (!tag.includes('/') && tag.length < 20 && tag.length > 2) {
      return tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase();
    }
  }

  return 'Miscellaneous';
}

async function updateMarketCategories() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const supabaseService = app.get(SupabaseService);
  const supabase = supabaseService.getClient();

  console.log('=== Restoring Human-Readable Categories ===\n');

  try {
    const { data: markets, error: marketsError } = await supabase
      .from('markets')
      .select('market_slug, title, tags');

    if (marketsError) throw marketsError;

    console.log(`Found ${markets.length} markets to process.`);

    let updated = 0;
    for (const market of markets) {
      const category = determineCategory(market.title || '', market.tags || []);
      
      const { error: updateError } = await supabase
        .from('markets')
        .update({ category })
        .eq('market_slug', market.market_slug);

      if (!updateError) updated++;
    }

    console.log(`\n✓ Restored ${updated} human categories.`);
  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await app.close();
  }
}

updateMarketCategories();
