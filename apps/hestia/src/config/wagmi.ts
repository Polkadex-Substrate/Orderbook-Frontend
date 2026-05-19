import { defaultWagmiConfig } from "@web3modal/wagmi/react/config";
import { cookieStorage, createStorage } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import type { Chain } from "viem";

import { SUPPORTED_EVM_CHAIN_IDS } from "@/config/bridge";

export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;
if (!projectId) throw new Error("Project ID is not defined");

const metadata = {
  name: "Polkadex Bridge",
  description: "Cross-chain bridge powered by Hyperbridge",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "https://orderbook.polkadex.trade",
  icons: ["https://avatars.githubusercontent.com/u/37784886"],
};

// Map of chain ID → wagmi chain object.
// Add an entry here when a new EVM chain is added to BRIDGE_CHAINS in config/bridge.ts.
const WAGMI_CHAIN_MAP: Record<number, Chain> = {
  1: mainnet,
  11155111: sepolia,
};

const chains = SUPPORTED_EVM_CHAIN_IDS.map(
  (id) => WAGMI_CHAIN_MAP[id]
).filter(Boolean) as [Chain, ...Chain[]];

export const config = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
  ssr: true,
  storage: createStorage({ storage: cookieStorage }),
  enableWalletConnect: true,
  enableInjected: true,
  enableEIP6963: true,
  enableCoinbase: true,
});
