import { getGraphQLConfig } from "@orderbook/core/config/graphql";

// ─── Types ───────────────────────────────────────────────────────────────────

export type BridgeAsset = {
  assetId: string;
  symbol: string;
  name: string;
  decimals: number;
  sourceChain: string;
  contractAddress: string; // ERC-20 contract address on Ethereum
  iconUrl?: string;
};

export type DepositStatus = {
  txHash: string;
  status: "Pending" | "Confirmed" | "Failed";
  validatorVotes: number;
  requiredVotes: number;
  amount: string;
  asset: string;
  recipient: string;
  estimatedCreditTime?: string; // ISO timestamp
};

// ─── Client ──────────────────────────────────────────────────────────────────

function getBridgeBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_BRIDGE_API_URL) {
    return process.env.NEXT_PUBLIC_BRIDGE_API_URL;
  }
  const { httpEndpoint } = getGraphQLConfig();
  return httpEndpoint.replace(/\/graphql\/?$/, "");
}

async function bridgeFetch<T>(path: string): Promise<T> {
  const base = getBridgeBaseUrl();
  const token =
    process.env.NEXT_PUBLIC_READ_ONLY_TOKEN ||
    process.env.READ_ONLY_TOKEN ||
    "READ_ONLY";

  const res = await fetch(`${base}/bridge${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Bridge API error ${res.status} for /bridge${path}`);
  }

  return res.json() as Promise<T>;
}

// ─── API surface ─────────────────────────────────────────────────────────────

export const bridgeApi = {
  fetchSupportedAssets: (): Promise<{ assets: BridgeAsset[] }> =>
    bridgeFetch("/supported-assets"),

  fetchDepositStatus: (txHash: string): Promise<DepositStatus> =>
    bridgeFetch(`/deposits/${encodeURIComponent(txHash)}`),
};
