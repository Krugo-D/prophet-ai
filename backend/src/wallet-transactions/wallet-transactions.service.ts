import { Inject, Injectable } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';

export interface WalletTransaction {
  wallet_address: string;
  market_slug: string;
  side: 'BUY' | 'SELL';
  price: number;
  shares: number;
  shares_normalized: number;
  volume_usd: number;
  token_id?: string;
  condition_id?: string;
  tx_hash?: string;
  order_hash?: string;
  timestamp: Date;
}

export interface MarketInfo {
  market_slug: string;
  title: string;
  condition_id?: string;
  category: string;
  tags: string[];
  status: 'open' | 'closed';
  winning_side?: string;
  side_a_id?: string;
  side_b_id?: string;
  start_time?: number;
  end_time?: number;
  completed_time?: number;
  volume_total?: number;
}

@Injectable()
export class WalletTransactionsService {
  constructor(@Inject(SupabaseService) private supabaseService: SupabaseService) {}

  async storeTransaction(transaction: WalletTransaction): Promise<void> {
    const supabase = this.supabaseService.getClient();
    
    const { error } = await supabase
      .from('wallet_transactions')
      .insert({
        wallet_address: transaction.wallet_address,
        market_slug: transaction.market_slug,
        side: transaction.side,
        price: transaction.price,
        shares: transaction.shares,
        shares_normalized: transaction.shares_normalized,
        volume_usd: transaction.volume_usd,
        token_id: transaction.token_id,
        condition_id: transaction.condition_id,
        tx_hash: transaction.tx_hash,
        order_hash: transaction.order_hash,
        timestamp: transaction.timestamp.toISOString(),
      });

    if (error) {
      throw new Error(`Failed to store transaction: ${error.message}`);
    }
  }

  async storeTransactions(transactions: WalletTransaction[]): Promise<void> {
    const supabase = this.supabaseService.getClient();
    
    const { error } = await supabase
      .from('wallet_transactions')
      .insert(
        transactions.map((tx) => ({
          wallet_address: tx.wallet_address,
          market_slug: tx.market_slug,
          side: tx.side,
          price: tx.price,
          shares: tx.shares,
          shares_normalized: tx.shares_normalized,
          volume_usd: tx.volume_usd,
          token_id: tx.token_id,
          condition_id: tx.condition_id,
          tx_hash: tx.tx_hash,
          order_hash: tx.order_hash,
          timestamp: tx.timestamp.toISOString(),
        }))
      );

    if (error) {
      throw new Error(`Failed to store transactions: ${error.message}`);
    }
  }

  async upsertMarket(market: MarketInfo): Promise<void> {
    const supabase = this.supabaseService.getClient();
    
    const { error } = await supabase
      .from('markets')
      .upsert({
        market_slug: market.market_slug,
        title: market.title,
        condition_id: market.condition_id,
        category: market.category,
        tags: market.tags,
        status: market.status,
        winning_side: market.winning_side,
        side_a_id: market.side_a_id,
        side_b_id: market.side_b_id,
        start_time: market.start_time ? new Date(market.start_time * 1000).toISOString() : null,
        end_time: market.end_time ? new Date(market.end_time * 1000).toISOString() : null,
        completed_time: market.completed_time ? new Date(market.completed_time * 1000).toISOString() : null,
        volume_total: market.volume_total,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'market_slug',
      });

    if (error) {
      throw new Error(`Failed to upsert market: ${error.message}`);
    }
  }

  async getMarketBySlug(marketSlug: string): Promise<MarketInfo | null> {
    const supabase = this.supabaseService.getClient();
    
    const { data, error } = await supabase
      .from('markets')
      .select('*')
      .eq('market_slug', marketSlug)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch market: ${error.message}`);
    }

    return data as MarketInfo;
  }
}


