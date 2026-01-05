'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAccount, useDisconnect } from 'wagmi';

interface WalletContextType {
  impersonatedWallet: string | null;
  setImpersonatedWallet: (address: string | null) => void;
  activeWallet: string | null;
  isConnected: boolean;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected: isWagmiConnected } = useAccount();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const [impersonatedWallet, setImpersonatedWalletState] = useState<string | null>(null);

  // Load impersonated wallet from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('prophet_impersonated_wallet');
    if (saved) {
      setImpersonatedWalletState(saved);
    }
  }, []);

  const setImpersonatedWallet = (address: string | null) => {
    setImpersonatedWalletState(address);
    if (address) {
      localStorage.setItem('prophet_impersonated_wallet', address);
    } else {
      localStorage.removeItem('prophet_impersonated_wallet');
    }
  };

  const disconnect = () => {
    setImpersonatedWallet(null);
    if (isWagmiConnected) {
      wagmiDisconnect();
    }
  };

  const activeWallet = impersonatedWallet || (isWagmiConnected ? address || null : null);
  const isConnected = !!activeWallet;

  return (
    <WalletContext.Provider value={{ impersonatedWallet, setImpersonatedWallet, activeWallet, isConnected, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
