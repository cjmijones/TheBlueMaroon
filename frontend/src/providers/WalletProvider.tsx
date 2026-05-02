import React, { useMemo, useEffect } from "react";
import "@rainbow-me/rainbowkit/styles.css";

import {
  WagmiProvider,
  http,
} from "wagmi";
import { watchAccount } from "wagmi/actions";        // ✅ v2.0 entry-point
import { sepolia, mainnet } from "wagmi/chains";

import {
  RainbowKitProvider,
  getDefaultConfig,
  darkTheme,
} from "@rainbow-me/rainbowkit";

import { toast } from "sonner";

export function WalletProvider({ children }: { children: React.ReactNode }) {
  /* ---------------- React-Query ---------------- */
  // const [queryClient] = useState(() => new QueryClient());

  /* ---------------- wagmi config --------------- */
  const wagmiConfig = useMemo(
    () =>
      getDefaultConfig({
        appName:   "TheBlueMaroon",
        projectId: import.meta.env.VITE_WC_PROJECT_ID!,     // WalletConnect v2
        chains:    [sepolia, mainnet],
        transports: {
          [sepolia.id]: http(import.meta.env.VITE_ALCHEMY_SEPOLIA),
          [mainnet.id]: http(import.meta.env.VITE_ALCHEMY_MAINNET),
        },
        ssr: false,
      }),
    []
  );

  /* ---------- Handle wallet disconnect ---------- */
  useEffect(() => {
    // v2.0 signature: watchAccount(wagmiConfig, { …handlers })
    const unwatch = watchAccount(wagmiConfig, {
      onChange(account) {
        if (!account.address) {
          toast("Wallet disconnected");
          // queryClient.clear(); // Remove this or replace with appropriate cache clear if needed
        }
      },
    });
    return unwatch;                           // cleanup on unmount
  }, [wagmiConfig]);

  /* --------------- Providers tree ---------------- */
  return (
    <WagmiProvider config={wagmiConfig}>
      {/* Removed QueryClientProvider here */}
      <RainbowKitProvider theme={darkTheme()} modalSize="compact">
        {children}
      </RainbowKitProvider>
    </WagmiProvider>
  );
}
