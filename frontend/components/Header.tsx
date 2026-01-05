'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import ProphetLogo from './ProphetLogo';
import WalletModal from './WalletModal';
import { useWallet } from '../context/WalletContext';

export default function Header() {
  const { activeWallet, isConnected, impersonatedWallet, setImpersonatedWallet } = useWallet();
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const pathname = usePathname();

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname?.startsWith(path);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-[#1a1a3a]/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Navigation */}
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-3">
                <ProphetLogo size={36} />
                <span className="text-2xl font-bold gradient-text">Prophet</span>
              </Link>
              
              {/* Navigation Links - Only show if connected */}
              {isConnected && (
                <nav className="hidden md:flex items-center gap-1">
                  <Link
                    href="/"
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      isActive('/') && pathname !== '/foryou'
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2d2d4f]'
                    }`}
                  >
                    Profile
                  </Link>
                  <Link
                    href="/foryou"
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      isActive('/foryou')
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2d2d4f]'
                    }`}
                  >
                    For You
                  </Link>
                </nav>
              )}
            </div>

            {/* Wallet Connection Button */}
            <div className="flex items-center gap-4">
              {isConnected && activeWallet ? (
                <button
                  onClick={() => setIsWalletModalOpen(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  {formatAddress(activeWallet)}
                  {impersonatedWallet && <span className="text-[10px] opacity-70 ml-1">(Mock)</span>}
                </button>
              ) : (
                <button
                  onClick={() => setIsWalletModalOpen(true)}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <WalletModal 
        isOpen={isWalletModalOpen} 
        onClose={() => setIsWalletModalOpen(false)}
        onImpersonate={(addr) => setImpersonatedWallet(addr)}
      />
    </>
  );
}
