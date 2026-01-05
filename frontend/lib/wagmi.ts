'use client';

import { createConfig, http } from 'wagmi';
import { mainnet, sepolia, localhost } from 'wagmi/chains';
import { injected, metaMask } from 'wagmi/connectors';
import { walletConnect } from '@wagmi/connectors';

// For testing with wallet impersonation, we'll use localhost chain
// You can run a local node with: anvil --host 0.0.0.0
const chains = [mainnet, sepolia, localhost] as const;

export const config = createConfig({
  chains,
  connectors: [
    injected(),
    metaMask(),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id',
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [localhost.id]: http('http://localhost:8545'), // Local Anvil node
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
