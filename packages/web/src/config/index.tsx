import { cookieStorage, createStorage } from "@wagmi/core";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { defineChain } from "@reown/appkit/networks";

export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!projectId) throw new Error("Project ID is not defined");

export const kiteTestnet = defineChain({
  id: 2368,
  caipNetworkId: "eip155:2368",
  chainNamespace: "eip155",
  name: "KiteAI Testnet",
  nativeCurrency: { decimals: 18, name: "KITE", symbol: "KITE" },
  rpcUrls: {
    default: { http: ["https://rpc-testnet.gokite.ai"] },
  },
  blockExplorers: {
    default: { name: "KiteScan", url: "https://testnet.kitescan.ai" },
  },
  testnet: true,
});

export const networks = [kiteTestnet];

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  projectId,
  networks,
});

export const config = wagmiAdapter.wagmiConfig;
