import { Inject, Injectable } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { DomeapiService } from '../domeapi/domeapi.service';

export interface MarketRecommendation {
  market_slug: string;
  title: string;
  category: string;
  volume_total: number;
  status: string;
  reason: string; // Why this market was recommended
  match_score?: number; // 0-1 score indicating how well it matches wallet interests
  image_url?: string;
  outcomes?: any;
  end_time?: string;
}

@Injectable()
export class MarketsService {
  constructor(
    @Inject(SupabaseService) private supabaseService: SupabaseService,
    @Inject(DomeapiService) private domeapiService: DomeapiService,
  ) {}

  /**
   * Get market recommendations for a wallet based on their trading history using ML Vector Search
   */
  async getRecommendations(walletAddress: string, limit: number = 10): Promise<MarketRecommendation[]> {
    const supabase = this.supabaseService.getClient();

    // 1. Fetch the user's ML Interest Vector
    const { data: profile } = await supabase
      .from('wallet_interest_profiles')
      .select('interest_vector')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (!profile || !profile.interest_vector) {
      // Fallback to popular markets if no ML profile exists yet
      return this.getPopularMarkets(limit);
    }

    const userVector = profile.interest_vector;

    // 2. Perform Vector Search (Cosine Similarity) via RPC or raw query
    // We'll use a raw query through Supabase to find the closest markets
    // Cosine similarity in pgvector is (1 - (vector <=> userVector))
    const { data: recommendations, error } = await supabase
      .rpc('match_markets', {
        query_embedding: userVector,
        match_threshold: 0.1, // Minimum similarity
        match_count: limit,
      });

    if (error || !recommendations || recommendations.length === 0) {
      console.error('Vector search error or no results:', error);
      return this.getPopularMarkets(limit);
    }

    return recommendations.map((m: any) => ({
      market_slug: m.market_slug,
      title: m.title || m.market_slug,
      category: m.category || 'Uncategorized',
      volume_total: parseFloat(m.volume_total || '0'),
      status: m.status,
      reason: `AI Match: ${Math.round(m.similarity * 100)}% semantic alignment with your trading history`,
      match_score: m.similarity,
      image_url: m.image_url,
      outcomes: m.outcomes,
      end_time: m.end_time,
    }));
  }

  /**
   * Get specific markets by their slugs
   */
  async getMarketsBySlugs(slugs: string[]): Promise<MarketRecommendation[]> {
    if (!slugs || slugs.length === 0) return [];

    const supabase = this.supabaseService.getClient();

    const { data: markets, error } = await supabase
      .from('markets')
      .select('market_slug, title, category, volume_total, status, image_url, outcomes, end_time')
      .in('market_slug', slugs);

    if (error || !markets) {
      return [];
    }

    return markets.map(market => ({
      market_slug: market.market_slug,
      title: market.title || market.market_slug,
      category: market.category || 'Uncategorized',
      volume_total: parseFloat(market.volume_total || '0'),
      status: market.status,
      reason: 'Bookmarked market',
      match_score: 0,
      image_url: market.image_url,
      outcomes: market.outcomes,
      end_time: market.end_time,
    }));
  }

  /**
   * Get popular open markets as fallback recommendations
   */
  private async getPopularMarkets(limit: number): Promise<MarketRecommendation[]> {
    const supabase = this.supabaseService.getClient();

    const { data: markets } = await supabase
      .from('markets')
      .select('market_slug, title, category, volume_total, status, image_url, outcomes, end_time')
      .eq('status', 'open')
      .order('volume_total', { ascending: false })
      .limit(limit);

    if (!markets) {
      return [];
    }

    return markets.map(market => ({
      market_slug: market.market_slug,
      title: market.title || market.market_slug,
      category: market.category || 'Uncategorized',
      volume_total: parseFloat(market.volume_total || '0'),
      status: market.status,
      reason: 'Popular market with high volume',
      match_score: 0,
      image_url: market.image_url,
      outcomes: market.outcomes,
      end_time: market.end_time,
    }));
  }
}
