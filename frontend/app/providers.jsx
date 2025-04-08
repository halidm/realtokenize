"use client";

import { useState, useEffect } from "react";
import { WagmiConfig, createConfig, configureChains } from "wagmi";
import { hardhat } from "wagmi/chains";
import { publicProvider } from "wagmi/providers/public";
import { Toaster } from "react-hot-toast";
import { DemoWalletConnector } from "@/lib/demoConnector";
import { UserProvider } from "@/context/UserContext";
import { TransactionProvider } from "@/context/TransactionContext";

// Configure chains and providers
const { chains, publicClient, webSocketPublicClient } = configureChains(
  [hardhat],
  [publicProvider()]
);

// Configure Wagmi client with only hardhat for local development
const config = createConfig({
  autoConnect: true,
  connectors: [new DemoWalletConnector({ chains })],
  publicClient,
  webSocketPublicClient,
});

export function Providers({ children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <WagmiConfig config={config}>
      <UserProvider>
        <TransactionProvider>
          {mounted && children}
          <Toaster position="bottom-right" />
        </TransactionProvider>
      </UserProvider>
    </WagmiConfig>
  );
}
