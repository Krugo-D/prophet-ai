'use client';

import { useConnect, useAccount } from 'wagmi';
import { useState } from 'react';
import { useWallet } from '../context/WalletContext';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImpersonate?: (address: string) => void;
}

export default function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { connect, connectors, isPending } = useConnect();
  const { activeWallet, isConnected, impersonatedWallet, setImpersonatedWallet, disconnect } = useWallet();
  const [impersonateAddress, setImpersonateAddress] = useState('');

  if (!isOpen) return null;

  const handleImpersonate = () => {
    if (impersonateAddress && impersonateAddress.startsWith('0x') && impersonateAddress.length === 42) {
      setImpersonatedWallet(impersonateAddress);
      onClose();
    }
  };

  const handleDisconnect = () => {
    disconnect();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div className="bg-white dark:bg-[#1a1a3a] rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold gradient-text">Connect Wallet</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {isConnected ? (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-[#2d2d4f] rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                {impersonatedWallet ? 'Impersonated Wallet' : 'Connected Wallet'}
              </p>
              <p className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100 break-all">
                {activeWallet}
              </p>
            </div>
            <button
              onClick={handleDisconnect}
              className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Wallet Connectors */}
            <div className="space-y-2">
              {connectors.map((connector) => (
                <button
                  key={connector.id}
                  onClick={() => {
                    connect({ connector });
                    // Closing will be handled by the layout or effect when connection changes
                  }}
                  disabled={isPending}
                  className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {connector.name}
                  {isPending && <span className="animate-spin">⟳</span>}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-[#1a1a3a] text-gray-500">OR</span>
              </div>
            </div>

            {/* Impersonation for Testing */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Impersonate Wallet (Testing)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={impersonateAddress}
                  onChange={(e) => setImpersonateAddress(e.target.value)}
                  placeholder="0x..."
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2d2d4f] text-gray-900 dark:text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={handleImpersonate}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                >
                  Use
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                For testing with wallets from the database
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
