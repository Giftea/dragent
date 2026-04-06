import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { defineChain } from "viem";

export const kiteTestnet = defineChain({
  id:   2368,
  name: "Kite Testnet",
  nativeCurrency: {
    name:     "KITE",
    symbol:   "KITE",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ["https://rpc-testnet.gokite.ai"] },
  },
  blockExplorers: {
    default: {
      name: "KiteScan",
      url:  "https://testnet.kitescan.ai",
    },
  },
  testnet: true,
});

export const wagmiConfig = getDefaultConfig({
  appName:   "Dragent",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "dragent",
  chains:    [kiteTestnet],
  ssr:       true,
});