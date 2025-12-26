'use client';

import { useState } from 'react';
import WalletInput from '@/components/WalletInput';
import WalletProfile from '@/components/WalletProfile';
import ForYouMarkets from '@/components/ForYouMarkets';
import { getWalletProfile, WalletProfile as WalletProfileType } from '@/lib/api';

export default function Home() {
  const [wallet, setWallet] = useState<string>('');
  const [profile, setProfile] = useState<WalletProfileType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'foryou'>('profile');

  const handleWalletSubmit = async (walletAddress: string) => {
    setLoading(true);
    setError(null);
    setWallet(walletAddress);

    try {
      const profileData = await getWalletProfile(walletAddress);
      setProfile(profileData);
      setActiveTab('profile');
    } catch (err: any) {
      setError(err.message || 'Failed to load wallet profile');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-2">Prophet</h1>
          <p className="text-center text-gray-600 mb-8">Prediction Market Wallet Analytics</p>

          <div className="mb-8">
            <WalletInput onWalletSubmit={handleWalletSubmit} isLoading={loading} />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {profile && (
            <div className="bg-white rounded-lg shadow-lg">
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px">
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'profile'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Wallet Profile
                  </button>
                  <button
                    onClick={() => setActiveTab('foryou')}
                    className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'foryou'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    For You
                  </button>
                </nav>
              </div>

              <div className="p-6">
                {activeTab === 'profile' && <WalletProfile profile={profile} />}
                {activeTab === 'foryou' && <ForYouMarkets userCategories={profile.categories} />}
              </div>
            </div>
          )}

          {!profile && !loading && !error && (
            <div className="text-center py-12 text-gray-500">
              <p>Enter a wallet address to view its prediction market profile</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
