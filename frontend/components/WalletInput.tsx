'use client';

import { useState } from 'react';

interface WalletInputProps {
  onSearch: (wallet: string) => void;
}

export default function WalletInput({ onSearch }: WalletInputProps) {
  const [wallet, setWallet] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (wallet.trim()) {
      onSearch(wallet.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div className="flex gap-2">
        <input
          type="text"
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
          placeholder="Enter wallet address (0x...)"
          className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1a1a3a] text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
        />
        <button
          type="submit"
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 font-medium transition-colors shadow-lg"
        >
          Search
        </button>
      </div>
    </form>
  );
}
