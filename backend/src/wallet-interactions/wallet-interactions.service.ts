import { Inject, Injectable } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';

export interface WalletInteraction {
  wallet_address: string;
  market_slug: string;
  market_title: string;
  category: string;
  interaction_type: string;
  amount: number;
  timestamp: Date;
}

@Injectable()
export class WalletInteractionsService {
  constructor(@Inject(SupabaseService) private supabaseService: SupabaseService) {}

  async storeInteraction(interaction: WalletInteraction): Promise<void> {
    const supabase = this.supabaseService.getClient();
    
    const { error } = await supabase
      .from('wallet_interactions')
      .insert({
        wallet_address: interaction.wallet_address,
        market_slug: interaction.market_slug,
        market_title: interaction.market_title,
        category: interaction.category,
        interaction_type: interaction.interaction_type,
        amount: interaction.amount,
        timestamp: interaction.timestamp.toISOString(),
      });

    if (error) {
      throw new Error(`Failed to store interaction: ${error.message}`);
    }
  }

  async storeInteractions(interactions: WalletInteraction[]): Promise<void> {
    if (!this.supabaseService) {
      throw new Error('SupabaseService is not initialized');
    }
    const supabase = this.supabaseService.getClient();
    
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }
    
    const { error } = await supabase
      .from('wallet_interactions')
      .insert(
        interactions.map((interaction) => ({
          wallet_address: interaction.wallet_address,
          market_slug: interaction.market_slug,
          market_title: interaction.market_title,
          category: interaction.category,
          interaction_type: interaction.interaction_type,
          amount: interaction.amount,
          timestamp: interaction.timestamp.toISOString(),
        }))
      );

    if (error) {
      throw new Error(`Failed to store interactions: ${error.message}`);
    }
  }

  async getInteractionsByWallet(walletAddress: string): Promise<WalletInteraction[]> {
    const supabase = this.supabaseService.getClient();
    
    const { data, error } = await supabase
      .from('wallet_interactions')
      .select('*')
      .eq('wallet_address', walletAddress);

    if (error) {
      throw new Error(`Failed to fetch interactions: ${error.message}`);
    }

    return data || [];
  }
}

