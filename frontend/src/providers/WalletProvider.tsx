import React, { useMemo, useState } from "react";
import "@rainbow-me/rainbowkit/styles.css";

import { WagmiProvider, http } from "wagmi";
import { sepolia } from "wagmi/chains";

import {
  RainbowKitProvider,
  getDefaultConfig,
  darkTheme,
} from "@rainbow-me/rainbowkit";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  const wagmiConfig = useMemo(() =>
    getDefaultConfig({
      appName: "TheBlueMaroon",
      projectId: import.meta.env.VITE_WC_PROJECT_ID ?? "blue-maroon-temp-id",
      chains: [sepolia],
      transports: {
        [sepolia.id]: http(import.meta.env.VITE_ETH_RPC_URL),
      },
      ssr: false,
    })
  , []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme()}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
