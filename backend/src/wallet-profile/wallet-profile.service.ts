import { Inject, Injectable } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { WalletProfileDto } from './dto/wallet-profile.dto';

@Injectable()
export class WalletProfileService {
  constructor(@Inject(SupabaseService) private supabaseService: SupabaseService) {}

  async getWalletProfile(walletAddress: string): Promise<WalletProfileDto> {
    const supabase = this.supabaseService.getClient();
    
    // Get category summaries for this wallet
    const { data: categorySummaries, error } = await supabase
      .from('wallet_category_summary')
      .select('*')
      .eq('wallet_address', walletAddress);

    if (error) {
      throw new Error(`Failed to fetch wallet profile: ${error.message}`);
    }

    // Build response with volume and PnL per category
    const categories: { [key: string]: { volume: number; interactions: number; pnl: number | null } } = {};
    let totalInteractions = 0;
    let totalVolume = 0;
    let totalPnL = 0;

    if (categorySummaries) {
      categorySummaries.forEach((summary) => {
        categories[summary.category] = {
          volume: parseFloat(summary.total_volume) || 0,
          interactions: summary.total_interactions || 0,
          pnl: summary.pnl !== null ? parseFloat(summary.pnl) : null,
        };
        totalInteractions += summary.total_interactions || 0;
        totalVolume += parseFloat(summary.total_volume) || 0;
        if (summary.pnl !== null) {
          totalPnL += parseFloat(summary.pnl);
        }
      });
    }

    return {
      wallet: walletAddress,
      categories,
      totalInteractions,
      totalVolume,
      totalPnL,
    };
  }
}

