import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { EmbeddingService } from '../ml/embedding.service';
import { RankMarketsDto, MarketInput } from './dto/rank-markets.dto';

@Injectable()
export class B2BService {
  constructor(
    @Inject(SupabaseService) private supabaseService: SupabaseService,
    @Inject(EmbeddingService) private embeddingService: EmbeddingService,
  ) {}

  async rankMarkets(dto: RankMarketsDto) {
    const supabase = this.supabaseService.getClient();
    const { walletAddress, markets: inputMarkets } = dto;

    // 1. Fetch wallet's interest vector
    const { data: profile, error: profileError } = await supabase
      .from('wallet_interest_profiles')
      .select('interest_vector')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (profileError || !profile || !profile.interest_vector) {
      throw new NotFoundException(`Wallet missing in our database: ${walletAddress}`);
    }

    const walletVector = this.parseVector(profile.interest_vector);

    // 2. Resolve market embeddings
    // We'll check our DB first, then fetch missing ones from Google
    const slugs = inputMarkets.map(m => m.slug);
    const { data: existingMarkets } = await supabase
      .from('markets')
      .select('market_slug, embedding')
      .in('market_slug', slugs)
      .not('embedding', 'is', null);

    const existingEmbeddingsMap = new Map<string, number[]>();
    existingMarkets?.forEach(m => {
      existingEmbeddingsMap.set(m.market_slug, this.parseVector(m.embedding));
    });

    const results = [];
    const missingMarkets: MarketInput[] = [];

    for (const input of inputMarkets) {
      const vector = existingEmbeddingsMap.get(input.slug);
      if (vector) {
        results.push({ ...input, vector });
      } else {
        missingMarkets.push(input);
      }
    }

    // 3. Batch fetch missing embeddings
    if (missingMarkets.length > 0) {
      console.log(`B2B: Fetching ${missingMarkets.length} missing embeddings for ranking...`);
      const missingTitles = missingMarkets.map(m => m.title);
      const newVectors = await this.embeddingService.getEmbeddings(missingTitles);

      for (let i = 0; i < missingMarkets.length; i++) {
        const vector = newVectors[i];
        if (vector && vector.length > 0) {
          results.push({ ...missingMarkets[i], vector });
          
          // Background: Upsert to our DB so we have it for next time
          // (Fire and forget to not block the response)
          supabase.from('markets').upsert({
            market_slug: missingMarkets[i].slug,
            title: missingMarkets[i].title,
            embedding: vector as any,
            updated_at: new Date().toISOString()
          }).then(({ error }) => {
            if (error) console.error(`B2B: Failed to cache market ${missingMarkets[i].slug}`, error.message);
          });
        } else {
          // If embedding fails, push with neutral vector or skip
          results.push({ ...missingMarkets[i], vector: new Array(768).fill(0) });
        }
      }
    }

    // 4. Calculate similarities and sort
    const ranked = results.map(market => {
      const similarity = this.cosineSimilarity(walletVector, market.vector);
      // Remove vector from response to keep it clean
      const { vector, ...marketData } = market;
      return {
        ...marketData,
        relevance_score: Math.round(similarity * 1000) / 1000,
        match_percentage: `${Math.round(similarity * 100)}%`
      };
    }).sort((a, b) => b.relevance_score - a.relevance_score);

    return {
      wallet_address: walletAddress,
      total_ranked: ranked.length,
      recommendations: ranked
    };
  }

  private parseVector(v: any): number[] {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') return v.replace(/[\[\]]/g, '').split(',').map(Number);
    return [];
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length === 0 || b.length === 0) return 0;
    let dotProduct = 0;
    let mA = 0;
    let mB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      mA += a[i] * a[i];
      mB += b[i] * b[i];
    }
    const denom = Math.sqrt(mA) * Math.sqrt(mB);
    return denom === 0 ? 0 : dotProduct / denom;
  }
}
