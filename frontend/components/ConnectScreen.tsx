'use client';

import ProphetLogo from './ProphetLogo';
import WalletModal from './WalletModal';
import { useState } from 'react';
import { useWallet } from '../context/WalletContext';

export default function ConnectScreen() {
  const { isConnected, setImpersonatedWallet } = useWallet();
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  if (isConnected) {
    return null; // Don't show connect screen if already connected
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-[#0f0f23] dark:via-[#1a1a3a] dark:to-[#2d1b3d] px-4">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <ProphetLogo size={120} className="shadow-2xl shadow-indigo-500/30" />
        </div>

        {/* Title */}
        <div>
          <h1 className="text-4xl font-bold gradient-text mb-4">Welcome to Prophet</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Connect your wallet to analyze your Polymarket trading history and discover personalized market recommendations.
          </p>
        </div>

        {/* Features */}
        <div className="space-y-3 text-left bg-white/50 dark:bg-[#1a1a3a]/50 backdrop-blur-sm rounded-xl p-6">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">
              ✓
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Wallet Analysis</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">View your trading history, PnL, and category breakdown</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">
              ✓
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Smart Recommendations</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Get personalized market suggestions based on your interests</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">
              ✓
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Performance Tracking</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Monitor your PnL across categories and markets</p>
            </div>
          </div>
        </div>

        {/* Connect Button */}
        <button
          onClick={() => setIsWalletModalOpen(true)}
          className="w-full px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-lg transition-colors shadow-lg hover:shadow-xl"
        >
          Connect Wallet
        </button>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Your wallet connection is secure and private. We never store your private keys.
        </p>
      </div>

      <WalletModal 
        isOpen={isWalletModalOpen} 
        onClose={() => setIsWalletModalOpen(false)}
        onImpersonate={(addr) => setImpersonatedWallet(addr)}
      />
    </div>
  );
}
