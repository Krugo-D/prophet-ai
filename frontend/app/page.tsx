'use client';

import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ConnectScreen from '../components/ConnectScreen';
import WalletProfile from '../components/WalletProfile';
import { useWallet } from '../context/WalletContext';

interface WalletProfileData {
  wallet: string;
  categories: { [category: string]: { volume: number; interactions: number; pnl: number | null } };
  totalInteractions: number;
  totalVolume: number;
  totalPnL: number;
}

export default function Home() {
  const { activeWallet, isConnected, setImpersonatedWallet } = useWallet();
  const [walletData, setWalletData] = useState<WalletProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-load profile when wallet connects or changes
  useEffect(() => {
    if (activeWallet) {
      handleSearch(activeWallet);
    } else {
      setWalletData(null);
    }
  }, [activeWallet]);

  const handleSearch = async (wallet: string) => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4002';
      const response = await fetch(`${apiUrl}/wallet-profile/${wallet}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch wallet data: ${response.statusText}`);
      }
      const data = await response.json();
      setWalletData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch wallet data');
      setWalletData(null);
    } finally {
      setLoading(false);
    }
  };

  // Show connect screen if not connected
  if (!isConnected) {
    return (
      <>
        <Header />
        <ConnectScreen />
        <Footer />
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-[#0f0f23]">
      <Header />
      
      <main className="flex-1 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {loading && (
            <div className="text-center text-gray-600 dark:text-gray-400 py-8">Loading wallet data...</div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg mb-4">
              Error: {error}
            </div>
          )}

          {walletData && <WalletProfile data={walletData} />}
        </div>
      </main>

      <Footer />
    </div>
  );
}
// build trigger Mon Jan  5 16:58:19 +07 2026
