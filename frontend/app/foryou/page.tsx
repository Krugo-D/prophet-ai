'use client';

import Header from '../../components/Header';
import Footer from '../../components/Footer';
import ConnectScreen from '../../components/ConnectScreen';
import ForYouMarkets from '../../components/ForYouMarkets';
import { useWallet } from '../../context/WalletContext';

export default function ForYouPage() {
  const { activeWallet, isConnected, setImpersonatedWallet } = useWallet();

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
          <ForYouMarkets 
            walletAddress={activeWallet || undefined}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
