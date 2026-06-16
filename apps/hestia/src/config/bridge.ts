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
// Single source of truth for all Sepolia ↔ Polkadex bridgeable tokens.
// When the backend API is ready, replace this array with the API response —
// the shape of each entry must match BridgeTokenConfig.
export const SEPOLIA_PDEX_TOKENS: BridgeTokenConfig[] = [
  {
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
          "0x4BF5DfE56ec0BF9023fE48E0fE79B457234F19eb") as `0x${string}`,
      },
      polkadex: { assetId: "3" },
    },
  },
  {
    id: "usdc",
    name: "USD Coin",
    ticker: "USDC",
    decimals: 6,
    logo: "USDC",
    chains: {
      sepolia: {
        address: (process.env.NEXT_PUBLIC_BRIDGE_USDC_ADDRESS ??
          "0xb177b85d589B806E9e82C02e5b92180a4B4d90bb") as `0x${string}`,
        hftAddress: (process.env.NEXT_PUBLIC_BRIDGE_USDC_HFT_ADDRESS ??
          "0x0b99D76bAcECC206f73f0dF248F8f2e81a7Aa017") as `0x${string}`,
      },
    },
  },
  {
    id: "usdt",
    name: "Tether USD",
    ticker: "USDT",
    decimals: 6,
    logo: "USDT",
    chains: {
      sepolia: {
        address: (process.env.NEXT_PUBLIC_BRIDGE_USDT_ADDRESS ??
          "0x086d2f4CCD29D6CbD921EF0aa09EC20F67f7d69D") as `0x${string}`,
        hftAddress: (process.env.NEXT_PUBLIC_BRIDGE_USDT_HFT_ADDRESS ??
          "0x080e4d3a1AFEC4025De70D0b432359Ee1781E794") as `0x${string}`,
      },
    },
  },
  {
    id: "wbtc",
    name: "Wrapped Bitcoin",
    ticker: "WBTC",
    decimals: 8,
    logo: "UNKN",
    chains: {
      sepolia: {
        address: (process.env.NEXT_PUBLIC_BRIDGE_WBTC_ADDRESS ??
          "0xf32CCA1B10C65553690F9F72Afe8df13CC33A406") as `0x${string}`,
        hftAddress: (process.env.NEXT_PUBLIC_BRIDGE_WBTC_HFT_ADDRESS ??
          "0x2285620Bc2d9324d452CF8d116be3027a13E26ac") as `0x${string}`,
      },
    },
  },
  {
    id: "link",
    name: "Chainlink",
    ticker: "LINK",
    decimals: 18,
    logo: "UNKN",
    chains: {
      sepolia: {
        address: (process.env.NEXT_PUBLIC_BRIDGE_LINK_ADDRESS ??
          "0xEfa898bCb94Cc119F4687F47dc77E68f5F097197") as `0x${string}`,
        hftAddress: (process.env.NEXT_PUBLIC_BRIDGE_LINK_HFT_ADDRESS ??
          "0x43FA2a713549AC3Fe514B4A31567a0Ffe3804c91") as `0x${string}`,
      },
    },
  },
  {
    id: "uni",
    name: "Uniswap",
    ticker: "UNI",
    decimals: 18,
    logo: "UNKN",
    chains: {
      sepolia: {
        address: (process.env.NEXT_PUBLIC_BRIDGE_UNI_ADDRESS ??
          "0x491497cf6ec0D498A0586Af9679F0F5dA94e4e24") as `0x${string}`,
        hftAddress: (process.env.NEXT_PUBLIC_BRIDGE_UNI_HFT_ADDRESS ??
          "0x9D158F213F5FC1c38B1BcD56896BC248157A6366") as `0x${string}`,
      },
    },
  },
  {
    id: "aave",
    name: "Aave",
    ticker: "AAVE",
    decimals: 18,
    logo: "UNKN",
    chains: {
      sepolia: {
        address: (process.env.NEXT_PUBLIC_BRIDGE_AAVE_ADDRESS ??
          "0x8D7392d6e955a87B41383037826157011700B2c8") as `0x${string}`,
        hftAddress: (process.env.NEXT_PUBLIC_BRIDGE_AAVE_HFT_ADDRESS ??
          "0x6d0B51A4C14a9E25bfb4B5aa241c1e126c36eb00") as `0x${string}`,
      },
    },
  },
  {
    id: "wsteth",
    name: "Wrapped Staked Ether",
    ticker: "wstETH",
    decimals: 18,
    logo: "UNKN",
    chains: {
      sepolia: {
        address: (process.env.NEXT_PUBLIC_BRIDGE_WSTETH_ADDRESS ??
          "0xcF47f5C69aE7bEee74C12d37fe5842dA64e4f9aa") as `0x${string}`,
        hftAddress: (process.env.NEXT_PUBLIC_BRIDGE_WSTETH_HFT_ADDRESS ??
          "0x903C2Be4599bc114913d66496B8402307BE23369") as `0x${string}`,
      },
    },
  },
];

// Derived lookup map — used by bridge functions that need to look up a token by id.
// Do not modify this directly; add tokens to SEPOLIA_PDEX_TOKENS above.
export const BRIDGE_TOKENS: Record<string, BridgeTokenConfig> = Object.fromEntries(
  SEPOLIA_PDEX_TOKENS.map((t) => [t.id, t]),
);

// ─── Route definitions ────────────────────────────────────────────────────────

export const BRIDGE_ROUTES: BridgeRouteConfig[] = [
  {
    id: "sepolia-polkadex",
    sourceChainId: "sepolia",
    destinationChainId: "polkadex",
    supportedTokenIds: SEPOLIA_PDEX_TOKENS.map((t) => t.id),
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
