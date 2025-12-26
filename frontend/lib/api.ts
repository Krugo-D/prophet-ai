// API client for backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4002';

export interface WalletProfile {
  wallet: string;
  categories: {
    [category: string]: {
      volume: number;
      interactions: number;
      pnl: number | null;
    };
  };
  totalInteractions: number;
  totalVolume: number;
  totalPnL: number;
}

export async function getWalletProfile(walletAddress: string): Promise<WalletProfile> {
  const response = await fetch(`${API_BASE_URL}/wallet-profile/${walletAddress}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch wallet profile: ${response.statusText}`);
  }
  return response.json();
}

