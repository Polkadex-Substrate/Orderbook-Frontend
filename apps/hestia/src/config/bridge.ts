// ─── Types ────────────────────────────────────────────────────────────────────

export interface EvmChainConfig {
  id: string;
  name: string;
  type: "EVM";
  logo: string;
  chainId: number;
  stateMachineId: string;
  rpcUrl: string;
  ismpHost: `0x${string}`;
  consensusStateId: string;
  nativeCurrency: { symbol: string; decimals: number };
}

export interface SubstrateChainConfig {
  id: string;
  name: string;
  type: "Substrate";
  logo: string;
  stateMachineId: string;
  wsUrl: string;
  consensusStateId: string;
  hasher: "Keccak" | "Blake2";
  nativeCurrency: { symbol: string; decimals: number };
}

export type BridgeChainConfig = EvmChainConfig | SubstrateChainConfig;

export interface BridgeTokenConfig {
  id: string;
  name: string;
  ticker: string;
  decimals: number;
  logo: string;
  chains: Record<
    string,
    { address?: `0x${string}`; assetId?: string; hftAddress?: `0x${string}` }
  >;
}

export interface BridgeRouteConfig {
  id: string;
  sourceChainId: string;
  destinationChainId: string;
  supportedTokenIds: string[];
  relayerFeeRate: number;
  timeout: number;
  indexerUrl: string;
}

// ─── Chain definitions ────────────────────────────────────────────────────────

export const BRIDGE_CHAINS: Record<string, BridgeChainConfig> = {
  sepolia: {
    id: "sepolia",
    name: "Sepolia Testnet",
    type: "EVM",
    logo: "Ethereum",
    chainId: 11155111,
    stateMachineId: "EVM-11155111",
    rpcUrl:
      process.env.NEXT_PUBLIC_BRIDGE_SEPOLIA_RPC_URL ??
      "https://lb.drpc.live/sepolia/AlESv0IOzU1oqwgJvN0i5cK7r27IGSIR8Z1OtuZZzRRv",
    ismpHost: (process.env.NEXT_PUBLIC_BRIDGE_ISMP_HOST ??
      "0x2EdB74C269948b60ec1000040E104cef0eABaae8") as `0x${string}`,
    consensusStateId: "ETH0",
    nativeCurrency: { symbol: "ETH", decimals: 18 },
  } satisfies EvmChainConfig,

  polkadex: {
    id: "polkadex",
    name: "Polkadex Testnet",
    type: "Substrate",
    logo: "Polkadex",
    stateMachineId:
      process.env.NEXT_PUBLIC_POLKADEX_STATE_MACHINE ?? "SUBSTRATE-PDEX",
    wsUrl:
      process.env.NEXT_PUBLIC_BRIDGE_DESTINATION_RPC_URL ??
      "wss://polkadex-testnet.polkadex.ee",
    consensusStateId: "PDEX",
    hasher: "Keccak",
    nativeCurrency: { symbol: "PDEX", decimals: 12 },
  } satisfies SubstrateChainConfig,
};

// ─── Token definitions ────────────────────────────────────────────────────────

export const BRIDGE_TOKENS: Record<string, BridgeTokenConfig> = {
  weth: {
    id: "weth",
    name: "Wrapped Ether",
    ticker: "WETH",
    decimals: 18,
    logo: "weth",
    chains: {
      sepolia: {
        address: (process.env.NEXT_PUBLIC_BRIDGE_WETH_ADDRESS ??
          "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14") as `0x${string}`,
        hftAddress: (process.env.NEXT_PUBLIC_BRIDGE_WETH_HFT_ADDRESS ??
          "") as `0x${string}`,
      },
      polkadex: {
        assetId: "3",
      },
    },
  },
};

// ─── Route definitions ────────────────────────────────────────────────────────

export const BRIDGE_ROUTES: BridgeRouteConfig[] = [
  {
    id: "sepolia-polkadex",
    sourceChainId: "sepolia",
    destinationChainId: "polkadex",
    supportedTokenIds: ["weth"],
    relayerFeeRate: 0.0012,
    timeout: 3600,
    indexerUrl:
      process.env.NEXT_PUBLIC_BRIDGE_INDEXER_URL ??
      "https://hyperbridge-paseo-rpc.blockops.network",
  },
];

// ─── Helper functions ─────────────────────────────────────────────────────────

export function getBridgeChain(id: string): BridgeChainConfig {
  const chain = BRIDGE_CHAINS[id];
  if (!chain) throw new Error(`Unknown bridge chain: "${id}"`);
  return chain;
}

export function getBridgeToken(id: string): BridgeTokenConfig {
  const token = BRIDGE_TOKENS[id];
  if (!token) throw new Error(`Unknown bridge token: "${id}"`);
  return token;
}

export function getRouteSupportedTokens(
  sourceChainId: string,
  destinationChainId: string,
): BridgeTokenConfig[] {
  const route = BRIDGE_ROUTES.find(
    (r) =>
      r.sourceChainId === sourceChainId &&
      r.destinationChainId === destinationChainId,
  );
  if (!route) return [];
  return route.supportedTokenIds.map((id) => BRIDGE_TOKENS[id]).filter(Boolean);
}

export function getRouteConfig(
  sourceChainId: string,
  destinationChainId: string,
): BridgeRouteConfig | undefined {
  return BRIDGE_ROUTES.find(
    (r) =>
      r.sourceChainId === sourceChainId &&
      r.destinationChainId === destinationChainId,
  );
}

// EVM chain IDs the bridge currently supports — consumed by wagmi config
export const SUPPORTED_EVM_CHAIN_IDS: number[] = Object.values(BRIDGE_CHAINS)
  .filter((c): c is EvmChainConfig => c.type === "EVM")
  .map((c) => c.chainId);
