import { Inject, Injectable } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { DomeapiService } from '../domeapi/domeapi.service';

@Injectable()
export class PnlService {
  constructor(
    @Inject(SupabaseService) private supabaseService: SupabaseService,
    @Inject(DomeapiService) private domeapiService: DomeapiService,
  ) {}

  /**
   * Calculate PnL for a wallet in a specific market (only for finalized markets)
   */
  async calculateMarketPnL(walletAddress: string, marketSlug: string): Promise<number | null> {
    const supabase = this.supabaseService.getClient();
    
    // Get market summary for this wallet
    const { data: summary, error: summaryError } = await supabase
      .from('wallet_market_summary')
      .select('*')
      .eq('wallet_address', walletAddress)
      .eq('market_slug', marketSlug)
      .single();

    if (summaryError || !summary) {
      return null;
    }

    // Get market details
    const { data: market, error: marketError } = await supabase
      .from('markets')
      .select('*')
      .eq('market_slug', marketSlug)
      .single();

    if (marketError || !market) {
      return null;
    }

    // Only calculate PnL for finalized markets
    if (market.status !== 'closed' || !market.winning_side) {
      return null; // Market not finalized
    }

    const { total_volume_buy, total_volume_sell, net_shares } = summary;

    // Determine which side the wallet holds
    // We need to check which token_id corresponds to the winning side
    // For now, we'll use a simplified approach: if net_shares > 0, wallet has a position
    
    // Get the token_id for the winning side
    const winningTokenId = market.winning_side === 'side_a' ? market.side_a_id : market.side_b_id;
    
    // Check if wallet holds the winning side by looking at transactions
    const { data: transactions } = await supabase
      .from('wallet_transactions')
      .select('token_id, side, shares_normalized')
      .eq('wallet_address', walletAddress)
      .eq('market_slug', marketSlug);

    if (!transactions || transactions.length === 0) {
      return null;
    }

    // Calculate net position per token
    let netWinningShares = 0;
    let netLosingShares = 0;

    transactions.forEach(tx => {
      if (tx.token_id === winningTokenId) {
        netWinningShares += tx.side === 'BUY' ? tx.shares_normalized : -tx.shares_normalized;
      } else {
        netLosingShares += tx.side === 'BUY' ? tx.shares_normalized : -tx.shares_normalized;
      }
    });

    // Calculate PnL
    let pnl = 0;

    if (netWinningShares > 0) {
      // Wallet holds winning side
      // PnL = (winning shares × 1.00) - buy_volume + sell_volume
      pnl = (netWinningShares * 1.0) - total_volume_buy + total_volume_sell;
    } else if (netWinningShares === 0 && net_shares === 0) {
      // Wallet closed position
      // PnL = sell_volume - buy_volume
      pnl = total_volume_sell - total_volume_buy;
    } else {
      // Wallet holds losing side or has net losing position
      // PnL = -buy_volume + sell_volume (lost everything on losing side)
      pnl = -total_volume_buy + total_volume_sell;
    }

    // Update the summary with calculated PnL
    await supabase
      .from('wallet_market_summary')
      .update({
        pnl: pnl,
        is_finalized: true,
        winning_side_held: netWinningShares > 0,
      })
      .eq('wallet_address', walletAddress)
      .eq('market_slug', marketSlug);

    return pnl;
  }

  /**
   * Calculate and update PnL for all finalized markets for a wallet
   */
  async calculateWalletPnL(walletAddress: string): Promise<void> {
    const supabase = this.supabaseService.getClient();
    
    // Get all finalized markets this wallet interacted with
    const { data: summaries } = await supabase
      .from('wallet_market_summary')
      .select('market_slug')
      .eq('wallet_address', walletAddress);

    if (!summaries) {
      return;
    }

    // Calculate PnL for each market
    for (const summary of summaries) {
      await this.calculateMarketPnL(walletAddress, summary.market_slug);
    }

    // Update category summaries
    await this.updateCategorySummaries(walletAddress);
  }

  /**
   * Update category summaries with PnL from finalized markets
   */
  async updateCategorySummaries(walletAddress: string): Promise<void> {
    const supabase = this.supabaseService.getClient();
    
    // Get all market summaries for this wallet
    const { data: summaries } = await supabase
      .from('wallet_market_summary')
      .select('market_slug, total_volume, total_interactions, pnl, is_finalized')
      .eq('wallet_address', walletAddress);

    if (!summaries || summaries.length === 0) {
      return;
    }

    // Get market slugs and fetch their categories
    const marketSlugs = summaries.map(s => s.market_slug);
    const { data: markets } = await supabase
      .from('markets')
      .select('market_slug, category')
      .in('market_slug', marketSlugs);

    // Create a map of market_slug -> category
    const marketCategoryMap = new Map<string, string>();
    if (markets) {
      markets.forEach(m => {
        marketCategoryMap.set(m.market_slug, m.category || 'Uncategorized');
      });
    }

    // Group by category and calculate totals
    const categoryData: { [category: string]: { volume: number; interactions: number; pnl: number; finalized: number; open: number } } = {};

    summaries.forEach((summary) => {
      const category = marketCategoryMap.get(summary.market_slug) || 'Uncategorized';
      if (!categoryData[category]) {
        categoryData[category] = { volume: 0, interactions: 0, pnl: 0, finalized: 0, open: 0 };
      }
      categoryData[category].volume += parseFloat(summary.total_volume) || 0;
      categoryData[category].interactions += summary.total_interactions || 0;
      if (summary.is_finalized && summary.pnl !== null) {
        categoryData[category].pnl += parseFloat(summary.pnl) || 0;
        categoryData[category].finalized += 1;
      } else {
        categoryData[category].open += 1;
      }
    });

    // Upsert category summaries
    for (const [category, data] of Object.entries(categoryData)) {
      await supabase
        .from('wallet_category_summary')
        .upsert({
          wallet_address: walletAddress,
          category: category,
          total_volume: data.volume,
          total_interactions: data.interactions,
          finalized_markets_count: data.finalized,
          open_markets_count: data.open,
          pnl: data.pnl,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'wallet_address,category',
        });
    }
  }
}

