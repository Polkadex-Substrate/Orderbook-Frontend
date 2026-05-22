# Adding a New Token or Chain to the Bridge

This guide covers everything required to extend the Hyperbridge-backed bridge with a new token or a new chain. The bridge was designed so that nearly all additions require changes in **exactly one file** — `apps/hestia/src/config/bridge.ts` — with only a handful of narrow follow-up steps depending on the scenario.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Adding a New Token to an Existing Route](#2-adding-a-new-token-to-an-existing-route)
3. [Adding a New EVM Source Chain](#3-adding-a-new-evm-source-chain)
4. [Adding a New Substrate Destination Chain](#4-adding-a-new-substrate-destination-chain)
5. [Adding a Completely New Route (New EVM ↔ New Substrate)](#5-adding-a-completely-new-route-new-evm--new-substrate)
6. [ABI Files](#6-abi-files)
7. [Environment Variables Reference](#7-environment-variables-reference)
8. [Testing Checklist](#8-testing-checklist)

---

## 1. Architecture Overview

The bridge configuration lives in a single registry file:

```
apps/hestia/src/config/bridge.ts
```

Everything else reads from it. The data flow is:

```
config/bridge.ts
    │
    ├── BridgeProvider.tsx          reads chain/token/route definitions,
    │                               passes params to all hooks
    │
    ├── useEvmTokenBalance.ts       accepts { tokenAddress, rpcUrl, decimals }
    ├── useSubstrateWethBalance.ts  accepts { wsUrl, assetId, decimals }
    ├── useSubstrateNativeBalance.ts accepts { wsUrl, decimals }
    ├── useHyperbridgeFees.ts       accepts { sourceChainConfig, destChainConfig }
    │
    ├── ethereumToSubstrate.ts      derives Source / Destination / Token from config
    ├── substrateToEthereum.ts      derives POLKADEX_WS_URL / TOKEN_GATEWAY_ADDRESS
    │                               / SEPOLIA_STATE_MACHINE from config
    │
    └── config/wagmi.ts             derives EVM chain list from SUPPORTED_EVM_CHAIN_IDS
```

The config file defines three collections:

| Collection | Purpose |
|------------|---------|
| `BRIDGE_CHAINS` | One entry per chain. EVM chains use `EvmChainConfig`; Substrate chains use `SubstrateChainConfig`. |
| `BRIDGE_TOKENS` | One entry per bridgeable token. Each token carries per-chain details (EVM contract address or Substrate asset ID). |
| `BRIDGE_ROUTES` | One entry per directional route (source + destination + list of supported token IDs). |

---

## 2. Adding a New Token to an Existing Route

**Example:** Add USDC on the existing `sepolia → polkadex` route.

### Prerequisites

Before writing code, collect the following information:

| Item | Where to get it |
|------|----------------|
| EVM contract address of USDC on Sepolia | Sepolia block explorer or protocol docs |
| Decimals of USDC on Sepolia | Contract `decimals()` call (typically `6` for USDC) |
| Substrate asset ID for USDC on Polkadex | Polkadex team / on-chain `assets.metadata` enumeration |
| Icon key supported by `@polkadex/ux` `TokenAppearance` | `TokenAppearance` type definition in `@polkadex/ux` |

### Step 1 — Add the token to `BRIDGE_TOKENS` in `config/bridge.ts`

```ts
// apps/hestia/src/config/bridge.ts

export const BRIDGE_TOKENS: Record<string, BridgeTokenConfig> = {
  weth: { /* existing entry — do not touch */ },

  // ── ADD THIS ──────────────────────────────────────────────────────────────
  usdc: {
    id: "usdc",
    name: "USD Coin",
    ticker: "USDC",
    decimals: 6,
    logo: "usdc",                   // must match a TokenAppearance key in @polkadex/ux
    chains: {
      sepolia: {
        address: (process.env.NEXT_PUBLIC_BRIDGE_USDC_ADDRESS ??
          "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238") as `0x${string}`,
      },
      polkadex: {
        assetId: "5",               // confirm with Polkadex team
      },
    },
  },
};
```

### Step 2 — Add the token ID to the route's `supportedTokenIds`

```ts
// apps/hestia/src/config/bridge.ts

export const BRIDGE_ROUTES: BridgeRouteConfig[] = [
  {
    id: "sepolia-polkadex",
    sourceChainId: "sepolia",
    destinationChainId: "polkadex",
    supportedTokenIds: ["weth", "usdc"],    // <-- add "usdc" here
    relayerFeeRate: 0.0012,
    timeout: 3600,
    indexerUrl: process.env.NEXT_PUBLIC_BRIDGE_INDEXER_URL ?? "...",
  },
];
```

### Step 3 — Add the env var (optional but recommended)

In `.env.local` (or your deployment environment):

```env
NEXT_PUBLIC_BRIDGE_USDC_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
```

Expose it in `apps/hestia/next.config.js` under `env:`:

```js
// apps/hestia/next.config.js
env: {
  // existing vars...
  NEXT_PUBLIC_BRIDGE_USDC_ADDRESS: process.env.NEXT_PUBLIC_BRIDGE_USDC_ADDRESS,
},
```

### What happens automatically

- `SelectAsset` modal shows USDC alongside WETH (reads `supportedAssets` from `BridgeProvider` which calls `getRouteSupportedTokens()`)
- USDC balance is fetched via `useEvmTokenBalance` with the correct address and 6 decimals
- Substrate-side USDC balance is fetched via `useSubstrateWethBalance` with `assetId: "5"`
- `confirmTransaction.tsx` passes `selectedAsset.ticker` (`"USDC"`) and `selectedAsset.decimals` (`6`) to `transferSubstrateToEvm` automatically
- The token icon uses `selectedAsset.logo` (`"usdc"`) as the `TokenAppearance` key

**No other files need to change.**

---

## 3. Adding a New EVM Source Chain

**Example:** Add Ethereum Mainnet as a source chain.

### Prerequisites

| Item | Where to get it |
|------|----------------|
| ISMP Host contract address on Mainnet | Hyperbridge documentation / deployment registry |
| Token Gateway contract address on Mainnet | Hyperbridge deployment registry |
| Mainnet RPC URL | Alchemy / Infura / your own node |
| Chain ID | `1` for Ethereum Mainnet |
| State machine ID | `"EVM-1"` (pattern: `EVM-{chainId}`) |
| Consensus state ID | e.g. `"ETH0"` for Ethereum (check Hyperbridge docs) |
| ABI files | Copy and verify from Hyperbridge SDK or their deployment repo |

### Step 1 — Add the chain to `BRIDGE_CHAINS` in `config/bridge.ts`

```ts
// apps/hestia/src/config/bridge.ts

export const BRIDGE_CHAINS: Record<string, BridgeChainConfig> = {
  sepolia: { /* existing — do not touch */ },
  polkadex: { /* existing — do not touch */ },

  // ── ADD THIS ──────────────────────────────────────────────────────────────
  mainnet: {
    id: "mainnet",
    name: "Ethereum Mainnet",
    type: "EVM",
    logo: "ethereum",                // reuse same icon key as Sepolia
    chainId: 1,
    stateMachineId: "EVM-1",
    rpcUrl:
      process.env.NEXT_PUBLIC_BRIDGE_MAINNET_RPC_URL ??
      "https://eth.llamarpc.com",
    ismpHost: (process.env.NEXT_PUBLIC_BRIDGE_MAINNET_ISMP_HOST ??
      "0x<MAINNET_ISMP_HOST_ADDRESS>") as `0x${string}`,
    consensusStateId: "ETH0",
    tokenGatewayAddress: (process.env.NEXT_PUBLIC_BRIDGE_MAINNET_TOKEN_GATEWAY ??
      "0x<MAINNET_TOKEN_GATEWAY_ADDRESS>") as `0x${string}`,
    nativeCurrency: { symbol: "ETH", decimals: 18 },
  } satisfies EvmChainConfig,
};
```

### Step 2 — Add token details for the new chain

Any token that should be bridgeable from Mainnet needs its Mainnet contract address added under its `chains` entry:

```ts
// apps/hestia/src/config/bridge.ts

export const BRIDGE_TOKENS: Record<string, BridgeTokenConfig> = {
  weth: {
    id: "weth",
    // ...existing fields...
    chains: {
      sepolia: { address: "0x7b79995e5f793a07bc00c21412e50ecae098e7f9" },
      polkadex: { assetId: "3" },
      // ── ADD THIS ──────────────────────────────────────────────────────────
      mainnet: {
        address: (process.env.NEXT_PUBLIC_BRIDGE_MAINNET_WETH_ADDRESS ??
          "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2") as `0x${string}`,
      },
    },
  },
};
```

### Step 3 — Add a route for the new chain

```ts
// apps/hestia/src/config/bridge.ts

export const BRIDGE_ROUTES: BridgeRouteConfig[] = [
  { /* existing sepolia-polkadex route */ },

  // ── ADD THIS ──────────────────────────────────────────────────────────────
  {
    id: "mainnet-polkadex",
    sourceChainId: "mainnet",
    destinationChainId: "polkadex",
    supportedTokenIds: ["weth"],
    relayerFeeRate: 0.0012,
    timeout: 3600,
    indexerUrl:
      process.env.NEXT_PUBLIC_BRIDGE_INDEXER_URL ??
      "https://hyperbridge-paseo-rpc.blockops.network",
  },
];
```

### Step 4 — Register the chain in `config/wagmi.ts`

`SUPPORTED_EVM_CHAIN_IDS` is automatically derived from `BRIDGE_CHAINS` (any entry with `type: "EVM"`). The only manual step is adding the wagmi chain object to the lookup map:

```ts
// apps/hestia/src/config/wagmi.ts
import { mainnet, sepolia } from "wagmi/chains";

const WAGMI_CHAIN_MAP: Record<number, Chain> = {
  1: mainnet,           // <-- already here; if not, add it
  11155111: sepolia,
};
```

Because `chainId: 1` is now in `BRIDGE_CHAINS.mainnet`, `SUPPORTED_EVM_CHAIN_IDS` will automatically include `1`, and the wagmi config will pick it up from `WAGMI_CHAIN_MAP`.

### Step 5 — Add ABI files for the new chain

The transfer function in `ethereumToSubstrate.ts` uses Sepolia-specific ABIs. For Mainnet, the contract interfaces are the same but deployed at different addresses. Create a new set of ABI files:

```
apps/hestia/src/lib/hyperbridge/abis/
  ethSepoliaHostModule.ts            ← existing (Sepolia)
  ethSepoliaFeeTokenModule.ts        ← existing (Sepolia)
  ethSepoliaTokenGatewayModule.ts    ← existing (Sepolia)
  ethMainnetHostModule.ts            ← NEW: copy structure, same ABI
  ethMainnetFeeTokenModule.ts        ← NEW: copy structure, same ABI
  ethMainnetTokenGatewayModule.ts    ← NEW: copy structure, same ABI
```

The ABI content (function signatures) is identical — only the file names differ. You can literally duplicate the existing files and rename them.

### Step 6 — Update `ethereumToSubstrate.ts` to select the right ABI and helpers per chain

Currently `ethereumToSubstrate.ts` has one hardcoded `createHelpers()` function and one set of ABI imports. When supporting multiple source chains, the approach is to parameterize `createHelpers` and the ABI selection by the active source chain:

```ts
// apps/hestia/src/lib/hyperbridge/ethereumToSubstrate.ts

// Import both sets of ABIs
import SEPOLIA_HOST_MODULE from "./abis/ethSepoliaHostModule.ts";
import SEPOLIA_TOKEN_GATEWAY_MODULE from "./abis/ethSepoliaTokenGatewayModule.ts";
import MAINNET_HOST_MODULE from "./abis/ethMainnetHostModule.ts";
import MAINNET_TOKEN_GATEWAY_MODULE from "./abis/ethMainnetTokenGatewayModule.ts";

// ABI registry keyed by chain ID
const ABI_MAP: Record<number, { host: typeof SEPOLIA_HOST_MODULE; tokenGateway: typeof SEPOLIA_TOKEN_GATEWAY_MODULE }> = {
  11155111: { host: SEPOLIA_HOST_MODULE, tokenGateway: SEPOLIA_TOKEN_GATEWAY_MODULE },
  1:        { host: MAINNET_HOST_MODULE, tokenGateway: MAINNET_TOKEN_GATEWAY_MODULE },
};

export async function transferTokens({
  amount,
  recipient,
  sourceChainId = 11155111,          // accept source chain as parameter
}: {
  amount: number;
  recipient: string;
  sourceChainId?: number;
}) {
  const chainABIs = ABI_MAP[sourceChainId];
  if (!chainABIs) throw new Error(`No ABI map for chainId ${sourceChainId}`);

  const evmChain = Object.values(BRIDGE_CHAINS).find(
    (c) => c.type === "EVM" && (c as EvmChainConfig).chainId === sourceChainId
  ) as EvmChainConfig | undefined;
  if (!evmChain) throw new Error(`Chain ${sourceChainId} not in BRIDGE_CHAINS`);

  // rest of function uses evmChain.ismpHost, evmChain.tokenGatewayAddress,
  // evmChain.rpcUrl, and chainABIs.host / chainABIs.tokenGateway
}
```

Update `BridgeProvider.tsx` and `confirmTransaction.tsx` to pass `sourceChainId` when calling `transferTokens`.

### Step 7 — Add env vars

```env
NEXT_PUBLIC_BRIDGE_MAINNET_RPC_URL=https://eth.llamarpc.com
NEXT_PUBLIC_BRIDGE_MAINNET_ISMP_HOST=0x<address>
NEXT_PUBLIC_BRIDGE_MAINNET_TOKEN_GATEWAY=0x<address>
NEXT_PUBLIC_BRIDGE_MAINNET_WETH_ADDRESS=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
```

---

## 4. Adding a New Substrate Destination Chain

**Example:** Add Polkadot Asset Hub as a destination.

### Prerequisites

| Item | Where to get it |
|------|----------------|
| WebSocket RPC URL | Chain documentation |
| State machine ID | Hyperbridge docs (pattern: `SUBSTRATE-{IDENTIFIER}`) |
| Consensus state ID | Hyperbridge docs |
| Hasher type | Hyperbridge docs (`"Keccak"` or `"Blake2"`) |
| Native currency symbol + decimals | Chain documentation |
| Asset ID for each token on this chain | Chain block explorer or team |

### Step 1 — Add the chain to `BRIDGE_CHAINS`

```ts
// apps/hestia/src/config/bridge.ts

assetHub: {
  id: "assetHub",
  name: "Polkadot Asset Hub",
  type: "Substrate",
  logo: "polkadot",                // icon key in @polkadex/ux
  stateMachineId: "SUBSTRATE-ASSET-HUB",
  wsUrl:
    process.env.NEXT_PUBLIC_BRIDGE_ASSET_HUB_RPC_URL ??
    "wss://polkadot-asset-hub-rpc.polkadot.io",
  consensusStateId: "DOT0",
  hasher: "Blake2",
  nativeCurrency: { symbol: "DOT", decimals: 10 },
} satisfies SubstrateChainConfig,
```

### Step 2 — Add per-chain asset details on the token

```ts
// apps/hestia/src/config/bridge.ts

weth: {
  // ...
  chains: {
    sepolia:   { address: "0x7b79..." },
    polkadex:  { assetId: "3" },
    // ── ADD THIS ──────────────────────────────────────────────────────────
    assetHub:  { assetId: "1984" },   // example asset ID on Asset Hub
  },
},
```

### Step 3 — Add the route

```ts
// apps/hestia/src/config/bridge.ts

{
  id: "sepolia-assetHub",
  sourceChainId: "sepolia",
  destinationChainId: "assetHub",
  supportedTokenIds: ["weth"],
  relayerFeeRate: 0.0012,
  timeout: 3600,
  indexerUrl: process.env.NEXT_PUBLIC_BRIDGE_INDEXER_URL ?? "...",
},
```

### Step 4 — Verify `useSubstrateWethBalance` pallet compatibility

Different Substrate chains expose balances through different pallets. The current `useSubstrateWethBalance.ts` tries two pallets in order:

1. `api.query.assets.account` (standard Substrate Assets pallet)
2. `api.query.ormlTokens.accounts` (ORML Tokens pallet, common in Polkadex ecosystem)

Asset Hub uses `api.query.assets.account` with a numeric asset ID, so it should work out-of-the-box. If a new chain uses a different pallet, add a third branch in the `getApi().then(async (api) => { ... })` block inside `useSubstrateWethBalance.ts`:

```ts
// apps/hestia/src/lib/hyperbridge/useSubstrateWethBalance.ts

} else if (api.query.someCustomPallet?.balances) {
  const unsub = await api.query.someCustomPallet.balances(
    address,
    assetId,
    (result: any) => {
      // parse and setBalance
    },
  );
  unsubRef.current = unsub as unknown as () => void;
}
```

### Step 5 — Check `useSubstrateNativeBalance` decimals

`useSubstrateNativeBalance` reads the decimals from `nativeCurrency.decimals` in the chain config (set in Step 1). No code change needed — the decimals flow through automatically.

---

## 5. Adding a Completely New Route (New EVM ↔ New Substrate)

A completely new route combines Steps 3 and 4 above:

1. Add both chains to `BRIDGE_CHAINS` (one `EvmChainConfig`, one `SubstrateChainConfig`).
2. Add the token(s) or extend existing tokens with per-chain details in `BRIDGE_TOKENS`.
3. Add the route to `BRIDGE_ROUTES`.
4. Add the new EVM chain to `WAGMI_CHAIN_MAP` in `config/wagmi.ts`.
5. Add ABI files for the new EVM chain and update `ethereumToSubstrate.ts` ABI selection (see [Step 5–6 in Section 3](#step-5--add-abi-files-for-the-new-chain)).
6. Add env vars.

---

## 6. ABI Files

The ABI files live at:

```
apps/hestia/src/lib/hyperbridge/abis/
```

Currently present (Sepolia):

| File | Purpose |
|------|---------|
| `ethSepoliaHostModule.ts` | ISMP Host contract — routes messages between chains |
| `ethSepoliaFeeTokenModule.ts` | ERC-20 ABI used for fee token approvals |
| `ethSepoliaHandlerModule.ts` | Message handler (not currently used in transfer flow) |
| `ethSepoliaPingModule.ts` | Ping/echo test module (not used in production) |
| `ethSepoliaTokenGatewayModule.ts` | Token Gateway — the primary bridge entry point (`teleport` call) |

**When adding a new EVM chain:**

1. Copy all five files, rename the prefix (e.g. `ethMainnet...`).
2. The ABI arrays inside are identical — these contracts share the same interface across chains.
3. Only the deployed addresses differ, and those come from `BRIDGE_CHAINS` in config, not from ABI files.

Example for Mainnet:

```ts
// apps/hestia/src/lib/hyperbridge/abis/ethMainnetTokenGatewayModule.ts

// Copy the entire array from ethSepoliaTokenGatewayModule.ts
// The ABI (function signatures) is the same — only the address changes,
// and that comes from BRIDGE_CHAINS.mainnet.tokenGatewayAddress
const TOKEN_GATEWAY_ABI = [ /* same as Sepolia */ ] as const;
export default TOKEN_GATEWAY_ABI;
```

---

## 7. Environment Variables Reference

All bridge-related env vars live in `apps/hestia/next.config.js` under the `env:` block. They must also be added to `.env.local` (or the deployment environment) to take effect.

### Currently used (Sepolia ↔ Polkadex)

| Variable | Used in | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_BRIDGE_SEPOLIA_RPC_URL` | `config/bridge.ts` → `BRIDGE_CHAINS.sepolia.rpcUrl` | Sepolia HTTP RPC endpoint |
| `NEXT_PUBLIC_BRIDGE_ISMP_HOST` | `config/bridge.ts` → `BRIDGE_CHAINS.sepolia.ismpHost` | ISMP Host contract on Sepolia |
| `NEXT_PUBLIC_BRIDGE_TOKEN_GATEWAY_ADDRESS` | `config/bridge.ts` → `BRIDGE_CHAINS.sepolia.tokenGatewayAddress` | Token Gateway contract on Sepolia |
| `NEXT_PUBLIC_BRIDGE_WETH_ADDRESS` | `config/bridge.ts` → `BRIDGE_TOKENS.weth.chains.sepolia.address` | WETH ERC-20 contract on Sepolia |
| `NEXT_PUBLIC_BRIDGE_DESTINATION_RPC_URL` | `config/bridge.ts` → `BRIDGE_CHAINS.polkadex.wsUrl` | Polkadex WebSocket RPC |
| `NEXT_PUBLIC_POLKADEX_STATE_MACHINE` | `config/bridge.ts` → `BRIDGE_CHAINS.polkadex.stateMachineId` | Polkadex state machine ID (`SUBSTRATE-PDEX`) |
| `NEXT_PUBLIC_BRIDGE_INDEXER_URL` | `config/bridge.ts` → `BRIDGE_ROUTES[0].indexerUrl` | Hyperbridge indexer URL |
| `NEXT_PUBLIC_PROJECT_ID` | `config/wagmi.ts` | WalletConnect / Web3Modal project ID |

### Pattern for new chains

For each new EVM chain `X`, add:

```env
NEXT_PUBLIC_BRIDGE_X_RPC_URL=
NEXT_PUBLIC_BRIDGE_X_ISMP_HOST=
NEXT_PUBLIC_BRIDGE_X_TOKEN_GATEWAY=
```

For each new token `T` on chain `X`, add:

```env
NEXT_PUBLIC_BRIDGE_X_T_ADDRESS=
```

For each new Substrate chain `Y`, add:

```env
NEXT_PUBLIC_BRIDGE_Y_RPC_URL=
NEXT_PUBLIC_BRIDGE_Y_STATE_MACHINE=
```

---

## 8. Testing Checklist

After adding a new token or chain, verify the following before merging:

### Config sanity

- [ ] TypeScript compiles without new errors: `yarn workspace @orderbook/hestia build`
- [ ] New chain/token entry satisfies its interface type (the `satisfies` keyword in the config enforces this at compile time)
- [ ] `SUPPORTED_EVM_CHAIN_IDS` includes the new chain ID (console-log it in dev if unsure)
- [ ] `getRouteSupportedTokens(sourceId, destId)` returns the new token for the relevant route

### UI

- [ ] Bridge page loads without errors: `yarn dev`, open `/bridge`
- [ ] Source/destination chain dropdowns show the new chain
- [ ] Token selector modal shows the new token
- [ ] Selecting the new token updates the balance display
- [ ] Token icon renders correctly (the `logo` key matches a valid `TokenAppearance` in `@polkadex/ux`)

### Balances

- [ ] EVM wallet balance shows the correct token balance (calls `useEvmTokenBalance` with the right `tokenAddress` and `decimals`)
- [ ] Substrate wallet balance shows the correct token balance (calls `useSubstrateWethBalance` with the right `assetId` and `decimals`)
- [ ] Swapping direction (EVM → Substrate / Substrate → EVM) updates balances to the correct side

### Fees

- [ ] Fee estimation loads without errors when an amount is entered
- [ ] Fee ticker reflects the native currency of the source chain (e.g. `ETH` for EVM sources)

### Transfer (testnet only)

- [ ] EVM → Substrate: `transferTokens` completes without throwing; Hyperbridge indexer shows the request
- [ ] Substrate → EVM: `transferSubstrateToEvm` dispatches the transaction; the extension signing prompt appears
- [ ] Success alert is shown after both directions
- [ ] Balances refresh after a successful transfer

### Env var coverage

- [ ] All new `NEXT_PUBLIC_BRIDGE_*` vars are declared in `apps/hestia/next.config.js` under `env:`
- [ ] All new vars are documented in `.env.migration.example` (or equivalent)
