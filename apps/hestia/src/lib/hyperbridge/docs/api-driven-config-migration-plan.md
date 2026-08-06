# Migration Plan: Hardcoded Bridge Config → API-Driven Config

## Problem

The list of supported chains and tokens for the Hyperbridge bridge is fully hardcoded in `apps/hestia/src/config/bridge.ts`. Specifically:

- **`BRIDGE_CHAINS`** - 2 chains (Sepolia, Polkadex) defined as static constants
- **`SEPOLIA_PDEX_TOKENS`** - 8 tokens (WETH, USDC, USDT, WBTC, LINK, UNI, AAVE, wstETH) defined as a static array
- **`BRIDGE_ROUTES`** - derived from the above; also static

Any change to supported assets requires a frontend code change, PR review, and full deployment. This is a poor operational model: the backend/protocol team knows which tokens and chains are live, but they cannot make that change without going through the frontend release cycle.

---

## Goal

Replace all three static collections with data served by the backend API. The frontend should:

1. Fetch chains, tokens, and routes from a single API endpoint at startup (or on first bridge page load).
2. Use the fetched data exactly where the current static constants are used today - no other component needs to change.
3. Fall back gracefully if the API is unavailable (show an error state, never silently display stale hardcoded data).

---

## Proposed API Contract

The backend should expose one endpoint that returns everything the frontend needs to render the bridge and execute transfers. A suggested shape (align with the existing TypeScript interfaces in `config/bridge.ts`):

```
GET /bridge/config
Authorization: Bearer <READ_ONLY_TOKEN>

Response 200:
{
  "chains": [
    {
      "id": "sepolia",
      "name": "Sepolia Testnet",
      "type": "EVM",
      "logo": "Ethereum",
      "chainId": 11155111,
      "stateMachineId": "EVM-11155111",
      "rpcUrl": "https://...",
      "ismpHost": "0x2EdB74...",
      "consensusStateId": "ETH0",
      "nativeCurrency": { "symbol": "ETH", "decimals": 18 }
    },
    {
      "id": "polkadex",
      "name": "Polkadex",
      "type": "Substrate",
      "logo": "Polkadex",
      "stateMachineId": "SUBSTRATE-PDEX",
      "wsUrl": "wss://...",
      "consensusStateId": "PDEX",
      "hasher": "Keccak",
      "nativeCurrency": { "symbol": "PDEX", "decimals": 12 }
    }
  ],
  "tokens": [
    {
      "id": "weth",
      "name": "Wrapped Ether",
      "ticker": "WETH",
      "decimals": 18,
      "logo": "weth",
      "chains": {
        "sepolia": {
          "address": "0xfFf9976...",
          "hftAddress": "0x4BF5Dfe..."
        },
        "polkadex": {
          "assetId": "3"
        }
      }
    }
    // ...more tokens
  ],
  "routes": [
    {
      "id": "sepolia-polkadex",
      "sourceChainId": "sepolia",
      "destinationChainId": "polkadex",
      "supportedTokenIds": ["weth", "usdc", "usdt", "wbtc", "link", "uni", "aave", "wsteth"],
      "relayerFeeRate": 0.0012,
      "timeout": 3600,
      "indexerUrl": "https://..."
    }
  ]
}
```

The response shape maps 1:1 to `BridgeChainConfig`, `BridgeTokenConfig`, and `BridgeRouteConfig` already defined in `config/bridge.ts` - no new types needed.

---

## Files to Change

### 1. `apps/hestia/src/config/bridge.ts`

Remove the hardcoded `BRIDGE_CHAINS`, `SEPOLIA_PDEX_TOKENS`, `BRIDGE_TOKENS`, and `BRIDGE_ROUTES` constants. Keep:

- All TypeScript interfaces (`EvmChainConfig`, `SubstrateChainConfig`, `BridgeTokenConfig`, `BridgeRouteConfig`, `BridgeChainConfig`)
- All helper functions (`getBridgeChain`, `getBridgeToken`, `getRouteSupportedTokens`, `getRouteConfig`)

The helper functions will need to operate on the runtime data rather than module-level constants - see Step 3 below.

### 2. New file: `apps/hestia/src/lib/hyperbridge/useBridgeConfig.ts`

A TanStack Query hook that fetches the bridge config from the API:

```ts
import { useQuery } from "@tanstack/react-query";
import type {
  BridgeChainConfig,
  BridgeTokenConfig,
  BridgeRouteConfig,
} from "@/config/bridge";

interface BridgeConfig {
  chains: BridgeChainConfig[];
  tokens: BridgeTokenConfig[];
  routes: BridgeRouteConfig[];
}

export function useBridgeConfig() {
  return useQuery<BridgeConfig>({
    queryKey: ["bridge-config"],
    queryFn: async () => {
      const res = await fetch("/api/bridge/config", {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_READ_ONLY_TOKEN}`,
        },
      });
      if (!res.ok) throw new Error(`Bridge config fetch failed: ${res.status}`);
      return res.json() as Promise<BridgeConfig>;
    },
    staleTime: 5 * 60 * 1000, // treat config as fresh for 5 min
    gcTime: 30 * 60 * 1000, // keep in cache for 30 min after last use
    retry: 3,
  });
}
```

### 3. `apps/hestia/src/components/bridge/BridgeProvider.tsx`

Replace direct imports of `BRIDGE_CHAINS`, `BRIDGE_TOKENS`, `BRIDGE_ROUTES` with the `useBridgeConfig()` hook. The provider already owns the chain/token selection state - it is the right place to hold the async config and expose it to children via context.

Key changes:

- Call `useBridgeConfig()` at the top of `BridgeProvider`
- Pass `isLoading` / `error` states down through `BridgeContext` so child components can render a skeleton or error banner
- Replace calls like `getRouteSupportedTokens(src, dest)` with the in-memory version that reads from the fetched arrays (pass them in or expose via context)

### 4. `apps/hestia/src/components/bridge/Form/index.tsx` and related UI

Add a loading skeleton and an error state for when `useBridgeConfig` is in flight or has failed. The chain and token selectors must not render with empty/undefined lists.

---

## Migration Steps

### Step 1 - Agree on the API shape with the backend team

Before writing frontend code, confirm with the backend team that:

- The endpoint URL and auth mechanism match (same `READ_ONLY_TOKEN` pattern, or a new public endpoint)
- The response fields exactly match the interfaces in `config/bridge.ts`
- The `hftAddress` field for EVM-side token entries is included (it is a frontend-critical field, not a pure display field)
- The backend will include all fields needed for Substrate chains (`wsUrl`, `consensusStateId`, `hasher`)

### Step 2 - Create a Next.js API route proxy (optional but recommended)

To avoid exposing the backend URL and token to the browser, proxy the request through a Next.js API route:

```ts
// apps/hestia/src/app/api/bridge/config/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  const res = await fetch(`${process.env.GRAPHQL_URL}/bridge/config`, {
    headers: { Authorization: `Bearer ${process.env.READ_ONLY_TOKEN}` },
    next: { revalidate: 300 }, // Next.js ISR - revalidate every 5 min
  });
  if (!res.ok)
    return NextResponse.json(
      { error: "upstream error" },
      { status: res.status }
    );
  return NextResponse.json(await res.json());
}
```

This keeps `READ_ONLY_TOKEN` server-side only and lets Next.js cache the response at the edge.

### Step 3 - Implement `useBridgeConfig` (from the template in Files to Change above)

Add the query hook. At this stage it can still fall back to the hardcoded constants if the API is unavailable, to allow incremental rollout:

```ts
const { data, isLoading, error } = useBridgeConfig();
const chains = data?.chains ?? Object.values(BRIDGE_CHAINS); // temporary fallback
const tokens = data?.tokens ?? SEPOLIA_PDEX_TOKENS; // temporary fallback
const routes = data?.routes ?? BRIDGE_ROUTES; // temporary fallback
```

### Step 4 - Wire `BridgeProvider` to use the hook's data

Pass `chains`, `tokens`, and `routes` from the hook into the existing context value. All child components that currently call `getRouteSupportedTokens()` or access `BRIDGE_TOKENS` directly should be updated to read from context instead.

### Step 5 - Add loading and error states to the bridge UI

Wrap the bridge form in a conditional:

```tsx
if (isLoading) return <BridgeConfigSkeleton />;
if (error)
  return (
    <BridgeConfigError message="Could not load supported tokens. Please try again." />
  );
```

### Step 6 - Remove hardcoded constants and fallbacks

Once the API is proven stable in staging:

1. Delete `SEPOLIA_PDEX_TOKENS`, `BRIDGE_TOKENS`, and `BRIDGE_ROUTES` from `config/bridge.ts`
2. Remove the `BRIDGE_CHAINS` constant - only keep the TypeScript interfaces
3. Remove the temporary fallbacks from Step 3
4. Update `config/wagmi.ts` to derive `SUPPORTED_EVM_CHAIN_IDS` from the fetched chain list instead of the static constant

### Step 7 - Remove env vars that move to the API

Once all token addresses and chain endpoints are served from the API, the following env vars become redundant and should be removed from `next.config.js` and `.env.migration.example`:

```
NEXT_PUBLIC_BRIDGE_WETH_ADDRESS
NEXT_PUBLIC_BRIDGE_WETH_HFT_ADDRESS
NEXT_PUBLIC_BRIDGE_USDC_ADDRESS
NEXT_PUBLIC_BRIDGE_USDC_HFT_ADDRESS
... (all per-token NEXT_PUBLIC_BRIDGE_* vars)
NEXT_PUBLIC_BRIDGE_SEPOLIA_RPC_URL    (if rpcUrl moves to API)
NEXT_PUBLIC_BRIDGE_ISMP_HOST          (if ismpHost moves to API)
```

Keep only the URL/auth vars needed to reach the API itself.

---

## Caching Strategy

| Layer                                    | Mechanism                                         | TTL                |
| ---------------------------------------- | ------------------------------------------------- | ------------------ |
| Next.js API route (`/api/bridge/config`) | `next: { revalidate: 300 }`                       | 5 min              |
| TanStack Query client cache              | `staleTime: 5 * 60 * 1000`                        | 5 min              |
| Browser session                          | Query result survives navigation within a session | Until page refresh |

The bridge config changes rarely (only when new tokens or chains are added by the protocol team). A 5-minute TTL is conservative; it could safely be extended to 30 minutes or more.

---

## Error Handling and Fallback Policy

**No silent fallback to hardcoded data in production.** Displaying a stale hardcoded token list that doesn't match what the contracts actually support can cause user-facing transfer failures. Instead:

- If the API is unreachable on initial load: show an explicit error state with a retry button.
- If the API returns an unexpected shape: log a structured error (Sentry or equivalent) and show the same error state.
- In development only: allow falling back to the hardcoded constants to unblock local work when the backend is not running.

---

## What Does NOT Change

- The `BridgeChainConfig`, `BridgeTokenConfig`, `BridgeRouteConfig` interfaces - the API response must match them.
- The bridge transaction logic in `ethereumToSubstrate.ts` and `substrateToEthereum.ts` - they receive config objects at call time; the source of those objects is irrelevant.
- The `useEvmTokenBalance`, `useSubstrateWethBalance`, and other hooks - they accept config parameters, not module-level constants.
- The `WrappedHyperFungibleTokenABI` from `@hyperbridge/sdk` - chain-agnostic, unchanged.
- The ABI files in `lib/hyperbridge/abis/` - still needed for ISMP Host event parsing.
