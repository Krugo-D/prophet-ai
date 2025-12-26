export class CategoryStats {
  volume: number;
  interactions: number;
  pnl: number | null; // null for categories with no finalized markets
}

export class WalletProfileDto {
  wallet: string;
  categories: { [category: string]: CategoryStats };
  totalInteractions: number;
  totalVolume: number;
  totalPnL: number; // Sum of PnL from all finalized markets
}

