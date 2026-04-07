"use client";

import { wagmiAdapter, projectId, kiteTestnet } from "@/config";
import { QueryClientProvider }                   from "@tanstack/react-query";
import { createAppKit }                          from "@reown/appkit/react";
import { type ReactNode }                        from "react";
import { cookieToInitialState, WagmiProvider, type Config } from "wagmi";
import { queryClient }                           from "@/lib/queryClient";

if (!projectId) throw new Error("Project ID is not defined");

createAppKit({
  adapters:       [wagmiAdapter],
  projectId,
  networks:       [kiteTestnet],
  defaultNetwork: kiteTestnet,
  metadata: {
    name:        "Dragent",
    description: "AI trading agent with verifiable on-chain reasoning",
    url:         "https://dragent.ai",
    icons:       ["https://dragent.ai/logo.png"],
  },
  features: { analytics: false },
});

export default function ContextProvider({
  children,
  cookies,
}: {
  children: ReactNode;
  cookies:  string | null;
}) {
  const initialState = cookieToInitialState(
    wagmiAdapter.wagmiConfig as Config,
    cookies
  );

  return (
    <WagmiProvider
      config={wagmiAdapter.wagmiConfig as Config}
      initialState={initialState}
    >
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}