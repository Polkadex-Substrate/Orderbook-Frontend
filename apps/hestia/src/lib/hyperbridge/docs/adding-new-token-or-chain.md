# Adding a New Token or Chain to the Bridge

This guide covers everything required to extend the Hyperbridge-backed bridge with a new token or a new chain. The bridge was designed so that nearly all additions require changes in **exactly one file** — `apps/hestia/src/config/bridge.ts` — with only a handful of narrow follow-up steps depending on the scenario.

> **Scalability notice — read before adding anything**
>
> The current approach is **hardcoded**: `SEPOLIA_PDEX_TOKENS` (8 tokens) and `BRIDGE_CHAINS` (2 chains) are defined as static arrays/records in `apps/hestia/src/config/bridge.ts`. Every new token or chain requires a code change, a PR, and a deployment. This does not scale as the number of supported assets grows, and it puts the burden of updating on frontend engineers rather than on the backend/ops team.
>
> The planned solution is to replace the hardcoded lists with data served by the backend API. See [`api-driven-config-migration-plan.md`](./api-driven-config-migration-plan.md) for the full implementation plan. Until that migration is complete, continue to use this guide.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [HFT Contract Model (important — read first)](#2-hft-contract-model-important--read-first)
3. [Adding a New Token to an Existing Route](#3-adding-a-new-token-to-an-existing-route)
4. [Adding a New EVM Source Chain](#4-adding-a-new-evm-source-chain)
5. [Adding a New Substrate Destination Chain](#5-adding-a-new-substrate-destination-chain)
6. [Adding a Completely New Route (New EVM ↔ New Substrate)](#6-adding-a-completely-new-route-new-evm--new-substrate)
7. [ABI Files](#7-abi-files)
8. [Environment Variables Reference](#8-environment-variables-reference)
9. [Testing Checklist](#9-testing-checklist)

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
    │                               calls WrappedHFT.quote() → returns native fee in ETH
    │
    ├── ethereumToSubstrate.ts      EVM → Substrate
    │   └── calls WrappedHFT.send() via WrappedHyperFungibleTokenABI (from @hyperbridge/sdk)
    │       hftAddress sourced from BRIDGE_TOKENS[token].chains[evmChainId].hftAddress
    │
    ├── substrateToEthereum.ts      Substrate → EVM
    │   └── calls api.tx.hyperFungibleToken.send()
    │       destination: { Evm: chainId }  ← SCALE enum object, NOT string
    │
    └── config/wagmi.ts             derives EVM chain list from SUPPORTED_EVM_CHAIN_IDS
```

The config file defines three collections:

| Collection | Purpose |
|------------|---------|
| `BRIDGE_CHAINS` | One entry per chain. EVM chains use `EvmChainConfig`; Substrate chains use `SubstrateChainConfig`. |
| `BRIDGE_TOKENS` | One entry per bridgeable token. Each token carries per-chain details (`address`, `assetId`, and `hftAddress` for each EVM chain). |
| `BRIDGE_ROUTES` | One entry per directional route (source + destination + list of supported token IDs). |

---

## 2. HFT Contract Model (important — read first)

The bridge uses the **WrappedHyperFungibleToken (HFT)** contract pattern. Each bridgeable token has its own deployed `WrappedHFT` contract on every EVM chain. This replaced the older `TokenGateway.teleport()` model.

### Per-token `hftAddress`

The `hftAddress` field in `BRIDGE_TOKENS[token].chains[evmChainId]` is the address of the `WrappedHFT` contract for that specific token on that EVM chain. You get this address from the Hyperbridge team after they deploy and configure the contract for your token/destination pair.

### `isWeth` flag

Each `WrappedHFT` contract exposes an `isWeth()` view function. When `isWeth = true`:

- **EVM → Substrate**: the contract wraps native ETH internally — no ERC-20 approval needed. `msg.value` must cover `amount + nativeFee`.
- **Substrate → EVM**: on delivery, the contract calls `WETH9.withdraw()` and sends native ETH to the recipient. Tokens arrive as native ETH, not as WETH ERC-20.

The UI accounts for this by displaying "ETH" instead of "WETH" in the token selector when the ticker is "WETH".

### `relayerFee: 0n` is required

Always set `relayerFee: 0n`. With `isWeth = true`, any non-zero `relayerFee` causes the contract to try pulling WETH9 ERC-20 from the caller as the fee, which fails with `ERC20InsufficientAllowance` because no approval was granted (and the entire point of `isWeth` is to avoid approvals).

### `quote()` may revert for Substrate destinations

`WrappedHFT.quote(SendParams)` can revert when the destination chain hasn't been configured yet in the contract (Hyperbridge team does this on their side). Always wrap `quote()` in a try-catch and fall back to `0n`:

```ts
let nativeValue = 0n;
try {
  nativeValue = await publicClient.readContract({
    address: hftAddress,
    abi: WrappedHyperFungibleTokenABI,
    functionName: "quote",
    args: [sendParams],
  }) as bigint;
} catch {
  // destination may not be configured yet in the HFT contract
}
```

### `IsmpHostStateMachine` enum (Substrate → EVM)

When building the Substrate → EVM extrinsic, the `destination` field must be the SCALE-encoded `IsmpHostStateMachine` enum object — **not** a string like `"EVM-11155111"`:

```ts
// CORRECT
const destination = { Evm: _evmChain.chainId };   // e.g. { Evm: 11155111 }

// WRONG — Polkadot.js will throw "Cannot map Enum JSON, unable to find 'EVM-11155111'"
const destination = "EVM-11155111";
```

---

## 3. Adding a New Token to an Existing Route

**Example:** Add USDC on the existing `sepolia → polkadex` route.

### Prerequisites

Before writing code, collect the following from the Hyperbridge team and on-chain sources:

| Item | Where to get it |
|------|----------------|
| EVM contract address of USDC on Sepolia | Sepolia block explorer or protocol docs |
| Decimals of USDC on Sepolia | Contract `decimals()` call (typically `6` for USDC) |
| **`WrappedHFT` contract address for USDC on Sepolia** | **Hyperbridge team** — they must deploy and configure this contract for USDC ↔ Polkadex before the bridge works |
| **`isWeth` value for the USDC HFT contract** | Call `isWeth()` on the deployed contract. `false` for USDC (ERC-20 approval required). |
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
        // WrappedHFT contract for USDC — get this address from Hyperbridge team
        hftAddress: (process.env.NEXT_PUBLIC_BRIDGE_USDC_HFT_ADDRESS ??
          "") as `0x${string}`,
      },
      polkadex: {
        assetId: "5",               // confirm with Polkadex team
      },
    },
  },
};
```

> **Note on `hftAddress`**: The `WrappedHFT` contract must be deployed *and* configured by the Hyperbridge team for your token–destination pair before it can accept transfers. Getting `hftAddress` without this configuration means `send()` will revert. Confirm with the Hyperbridge team that `supportedChain("SUBSTRATE-PDEX")` returns a non-null peer module ID before going live.

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

### Step 3 — Add the env vars

In `.env.local` (or your deployment environment):

```env
NEXT_PUBLIC_BRIDGE_USDC_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
NEXT_PUBLIC_BRIDGE_USDC_HFT_ADDRESS=0x<WrappedHFT address from Hyperbridge team>
```

Expose them in `apps/hestia/next.config.js` under `env:`:

```js
// apps/hestia/next.config.js
env: {
  // existing vars...
  NEXT_PUBLIC_BRIDGE_USDC_ADDRESS: process.env.NEXT_PUBLIC_BRIDGE_USDC_ADDRESS,
  NEXT_PUBLIC_BRIDGE_USDC_HFT_ADDRESS: process.env.NEXT_PUBLIC_BRIDGE_USDC_HFT_ADDRESS,
},
```

### Step 4 — Check `isWeth` behavior and adjust approval logic

In `ethereumToSubstrate.ts`, the `isWeth` flag is read from the HFT contract at runtime:

```ts
const isWeth = await publicClient.readContract({
  address: hftAddress,
  abi: WrappedHyperFungibleTokenABI,
  functionName: "isWeth",
}) as boolean;
```

- `isWeth = false` (USDC): the code will check allowance and send an ERC-20 approval tx if needed. No additional changes required — the conditional is already in place.
- `isWeth = true` (WETH): native ETH path, no approval. `msg.value = amountWei + nativeFee`.

If the new token has `isWeth = true`, also update the UI display name mapping (see Section 3.5 below).

### Step 5 — Update UI display name if `isWeth = true`

If the new token behaves like WETH (funds arrive as native ETH on the EVM side), update the display-name overrides in:

- [Form/index.tsx](../../components/bridge/Form/index.tsx) — selected asset label
- [selectAsset.tsx](../../components/bridge/selectAsset.tsx) — token list item

```tsx
// Pattern already in place for WETH → ETH. Extend if needed:
ticker === "WETH" ? "ETH" : ticker
```

### What happens automatically

- `SelectAsset` modal shows USDC alongside WETH (reads `supportedAssets` from `BridgeProvider` which calls `getRouteSupportedTokens()`)
- USDC balance is fetched via `useEvmTokenBalance` with the correct address and 6 decimals
- Substrate-side USDC balance is fetched via `useSubstrateWethBalance` with `assetId: "5"`
- `confirmTransaction.tsx` passes `selectedAsset.ticker` (`"USDC"`) and `selectedAsset.decimals` (`6`) to `transferSubstrateToEvm` automatically
- The token icon uses `selectedAsset.logo` (`"usdc"`) as the `TokenAppearance` key
- EVM → Substrate: `ethereumToSubstrate.ts` picks up `hftAddress` from `BRIDGE_TOKENS.usdc.chains.sepolia.hftAddress`

**No other files need to change.**

---

## 4. Adding a New EVM Source Chain

**Example:** Add Ethereum Mainnet as a source chain.

### Prerequisites

| Item | Where to get it |
|------|----------------|
| ISMP Host contract address on Mainnet | Hyperbridge documentation / deployment registry |
| `WrappedHFT` contract address(es) for each token on Mainnet | **Hyperbridge team** — one contract per bridgeable token |
| Mainnet RPC URL | Alchemy / Infura / your own node |
| Chain ID | `1` for Ethereum Mainnet |
| State machine ID | `"EVM-1"` (pattern: `EVM-{chainId}`) |
| Consensus state ID | e.g. `"ETH0"` for Ethereum (check Hyperbridge docs) |

> There is no longer a `tokenGatewayAddress` field on EVM chains — the gateway logic is per-token via `hftAddress`. Do not add it to `EvmChainConfig`.

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
    logo: "ethereum",
    chainId: 1,
    stateMachineId: "EVM-1",
    rpcUrl:
      process.env.NEXT_PUBLIC_BRIDGE_MAINNET_RPC_URL ??
      "https://eth.llamarpc.com",
    ismpHost: (process.env.NEXT_PUBLIC_BRIDGE_MAINNET_ISMP_HOST ??
      "0x<MAINNET_ISMP_HOST_ADDRESS>") as `0x${string}`,
    consensusStateId: "ETH0",
    nativeCurrency: { symbol: "ETH", decimals: 18 },
  } satisfies EvmChainConfig,
};
```

### Step 2 — Add `hftAddress` for each token on the new chain

```ts
// apps/hestia/src/config/bridge.ts

export const BRIDGE_TOKENS: Record<string, BridgeTokenConfig> = {
  weth: {
    id: "weth",
    // ...existing fields...
    chains: {
      sepolia:  { address: "0x7b79...", hftAddress: "0x4BF5..." },
      polkadex: { assetId: "3" },
      // ── ADD THIS ──────────────────────────────────────────────────────────
      mainnet: {
        address: (process.env.NEXT_PUBLIC_BRIDGE_MAINNET_WETH_ADDRESS ??
          "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2") as `0x${string}`,
        hftAddress: (process.env.NEXT_PUBLIC_BRIDGE_MAINNET_WETH_HFT_ADDRESS ??
          "") as `0x${string}`,
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
  1: mainnet,           // <-- add if not already present
  11155111: sepolia,
};
```

### Step 5 — ABI files for the new chain

The `WrappedHyperFungibleTokenABI` comes from `@hyperbridge/sdk` and is chain-agnostic — no new ABI files needed for the HFT transfer logic.

The two local ABI files (`ethSepoliaHostModule.ts`, `ethSepoliaFeeTokenModule.ts`) are only used on the Sepolia side for:
- Parsing `PostRequestEvent` logs from the ISMP Host (for commitment extraction after a send)
- Checking ERC-20 allowance and approving fee tokens

If the Mainnet contracts have the same interfaces (they do — these are standard Hyperbridge contracts), create counterpart files:

```
apps/hestia/src/lib/hyperbridge/abis/
  ethMainnetHostModule.ts        ← copy from ethSepoliaHostModule.ts (same ABI, different address)
  ethMainnetFeeTokenModule.ts    ← copy from ethSepoliaFeeTokenModule.ts (same ABI)
```

Then update `ethereumToSubstrate.ts` to select the ABI set based on the active source chain.

### Step 6 — Add env vars

```env
NEXT_PUBLIC_BRIDGE_MAINNET_RPC_URL=https://eth.llamarpc.com
NEXT_PUBLIC_BRIDGE_MAINNET_ISMP_HOST=0x<address>
NEXT_PUBLIC_BRIDGE_MAINNET_WETH_ADDRESS=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
NEXT_PUBLIC_BRIDGE_MAINNET_WETH_HFT_ADDRESS=0x<WrappedHFT address from Hyperbridge team>
```

---

## 5. Adding a New Substrate Destination Chain

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
| **Confirmation that `WrappedHFT.supportedChain(stateMachineId)` returns a non-null peer module** | **Hyperbridge team** — they must register the destination on each `WrappedHFT` contract |

### Step 1 — Add the chain to `BRIDGE_CHAINS`

```ts
// apps/hestia/src/config/bridge.ts

assetHub: {
  id: "assetHub",
  name: "Polkadot Asset Hub",
  type: "Substrate",
  logo: "polkadot",
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
    sepolia:  { address: "0x7b79...", hftAddress: "0x4BF5..." },
    polkadex: { assetId: "3" },
    // ── ADD THIS ──────────────────────────────────────────────────────────
    assetHub: { assetId: "1984" },   // example asset ID on Asset Hub
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

### Step 4 — Verify `IsmpHostStateMachine` enum variant for the new chain

The Substrate → EVM direction uses `{ Evm: chainId }`. For Substrate → Substrate transfers (if ever needed), the enum variant will differ. Check the Polkadex pallet's `IsmpHostStateMachine` definition for the correct variant name before attempting cross-Substrate sends.

### Step 5 — Verify `useSubstrateWethBalance` pallet compatibility

Different Substrate chains expose balances through different pallets. The current `useSubstrateWethBalance.ts` tries two pallets in order:

1. `api.query.assets.account` (standard Substrate Assets pallet)
2. `api.query.ormlTokens.accounts` (ORML Tokens pallet, common in Polkadex ecosystem)

Asset Hub uses `api.query.assets.account` with a numeric asset ID, so it should work out-of-the-box. If a new chain uses a different pallet, add a third branch in the `getApi().then(async (api) => { ... })` block inside `useSubstrateWethBalance.ts`.

### Step 6 — Check `useSubstrateNativeBalance` decimals

`useSubstrateNativeBalance` reads the decimals from `nativeCurrency.decimals` in the chain config (set in Step 1). No code change needed — the decimals flow through automatically.

---

## 6. Adding a Completely New Route (New EVM ↔ New Substrate)

A completely new route combines Sections 4 and 5 above:

1. Add both chains to `BRIDGE_CHAINS` (one `EvmChainConfig`, one `SubstrateChainConfig`).
2. Add the token(s) or extend existing tokens with per-chain details in `BRIDGE_TOKENS` — including `hftAddress` for the EVM side.
3. Add the route to `BRIDGE_ROUTES`.
4. Add the new EVM chain to `WAGMI_CHAIN_MAP` in `config/wagmi.ts`.
5. Add local ABI files for the new EVM chain if the Host/FeeToken contracts differ from Sepolia (see [Section 7](#7-abi-files)).
6. Add env vars.
7. Confirm with the Hyperbridge team that:
   - The `WrappedHFT` contract is deployed for each token on the new EVM chain
   - `WrappedHFT.supportedChain(newSubstrateStateMachineId)` returns a non-null peer module
   - The HFT pallet is deployed on the new Substrate chain (`api.tx.hyperFungibleToken?.send` exists)

---

## 7. ABI Files

The ABI files live at:

```
apps/hestia/src/lib/hyperbridge/abis/
```

Currently present:

| File | Purpose |
|------|---------|
| `ethSepoliaHostModule.ts` | ISMP Host contract — used to parse `PostRequestEvent` logs after a send, to extract the post-request commitment |
| `ethSepoliaFeeTokenModule.ts` | ERC-20 ABI — used only for ERC-20 allowance check and approval when `isWeth = false` |

**Note**: The `WrappedHyperFungibleTokenABI` that drives the actual `send()` call comes from `@hyperbridge/sdk`, not from a local file. There is no local TokenGateway ABI file — that pattern was replaced by the HFT model.

**When adding a new EVM chain:**

1. Copy both files, rename the prefix (e.g. `ethMainnet...`).
2. The ABI arrays inside are identical — these contracts share the same interface across chains.
3. Only the deployed addresses differ, and those come from `BRIDGE_CHAINS` in config, not from ABI files.

---

## 8. Environment Variables Reference

All bridge-related env vars live in `apps/hestia/next.config.js` under the `env:` block. They must also be added to `.env.local` (or the deployment environment) to take effect.

### Currently used (Sepolia ↔ Polkadex)

| Variable | Used in | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_BRIDGE_SEPOLIA_RPC_URL` | `config/bridge.ts` → `BRIDGE_CHAINS.sepolia.rpcUrl` | Sepolia HTTP RPC endpoint |
| `NEXT_PUBLIC_BRIDGE_ISMP_HOST` | `config/bridge.ts` → `BRIDGE_CHAINS.sepolia.ismpHost` | ISMP Host contract on Sepolia |
| `NEXT_PUBLIC_BRIDGE_WETH_ADDRESS` | `config/bridge.ts` → `BRIDGE_TOKENS.weth.chains.sepolia.address` | WETH ERC-20 contract on Sepolia |
| `NEXT_PUBLIC_BRIDGE_WETH_HFT_ADDRESS` | `config/bridge.ts` → `BRIDGE_TOKENS.weth.chains.sepolia.hftAddress` | **WrappedHFT contract for WETH on Sepolia** — get from Hyperbridge team |
| `NEXT_PUBLIC_BRIDGE_DESTINATION_RPC_URL` | `config/bridge.ts` → `BRIDGE_CHAINS.polkadex.wsUrl` | Polkadex WebSocket RPC |
| `NEXT_PUBLIC_POLKADEX_STATE_MACHINE` | `config/bridge.ts` → `BRIDGE_CHAINS.polkadex.stateMachineId` | Polkadex state machine ID (`SUBSTRATE-PDEX`) |
| `NEXT_PUBLIC_BRIDGE_INDEXER_URL` | `config/bridge.ts` → `BRIDGE_ROUTES[0].indexerUrl` | Hyperbridge indexer URL |
| `NEXT_PUBLIC_PROJECT_ID` | `config/wagmi.ts` | WalletConnect / Web3Modal project ID |

### Pattern for new chains

For each new EVM chain `X`:

```env
NEXT_PUBLIC_BRIDGE_X_RPC_URL=
NEXT_PUBLIC_BRIDGE_X_ISMP_HOST=
```

For each new token `T` on EVM chain `X`:

```env
NEXT_PUBLIC_BRIDGE_X_T_ADDRESS=          # underlying ERC-20 address
NEXT_PUBLIC_BRIDGE_X_T_HFT_ADDRESS=      # WrappedHFT contract — from Hyperbridge team
```

For each new Substrate chain `Y`:

```env
NEXT_PUBLIC_BRIDGE_Y_RPC_URL=
NEXT_PUBLIC_BRIDGE_Y_STATE_MACHINE=
```

---

## 9. Testing Checklist

After adding a new token or chain, verify the following before merging:

### Config sanity

- [ ] TypeScript compiles without new errors: `yarn workspace @orderbook/hestia build`
- [ ] New chain/token entry satisfies its interface type (the `satisfies` keyword in the config enforces this at compile time)
- [ ] `SUPPORTED_EVM_CHAIN_IDS` includes the new chain ID (console-log it in dev if unsure)
- [ ] `getRouteSupportedTokens(sourceId, destId)` returns the new token for the relevant route
- [ ] `hftAddress` is set and non-empty for every EVM-side token entry

### HFT contract verification

- [ ] Call `isWeth()` on the HFT contract — confirm expected value (`true` for native-ETH-backed, `false` for ERC-20)
- [ ] If `isWeth = false`: ERC-20 approval path is exercised in `ethereumToSubstrate.ts`
- [ ] Call `supportedChain(destStateMachineId)` on the HFT contract — must return a non-null/non-empty peer module ID; if it returns empty bytes, contact the Hyperbridge team before going live
- [ ] Confirm `relayerFee: 0n` in both `ethereumToSubstrate.ts` and `useHyperbridgeFees.ts` — never set non-zero
- [ ] `quote()` is wrapped in try-catch with `0n` fallback (already in place; do not remove)

### Substrate → EVM destination encoding

- [ ] Destination is passed as `{ Evm: chainId }` object (not a string) to `api.tx.hyperFungibleToken.send()`
- [ ] Confirm new Substrate chains use the correct `IsmpHostStateMachine` enum variant

### UI

- [ ] Bridge page loads without errors: `yarn dev`, open `/bridge`
- [ ] Source/destination chain dropdowns show the new chain
- [ ] Token selector modal shows the new token with correct display name
- [ ] If `isWeth = true`, the token displays as its native ETH equivalent (e.g. "ETH" not "WETH")
- [ ] Selecting the new token updates the balance display
- [ ] Token icon renders correctly (the `logo` key matches a valid `TokenAppearance` in `@polkadex/ux`)

### Balances

- [ ] EVM wallet balance shows the correct token balance (calls `useEvmTokenBalance` with the right `tokenAddress` and `decimals`)
- [ ] Substrate wallet balance shows the correct token balance (calls `useSubstrateWethBalance` with the right `assetId` and `decimals`)
- [ ] Swapping direction (EVM → Substrate / Substrate → EVM) updates balances to the correct side

### Fees

- [ ] Fee estimation loads without errors when an amount is entered
- [ ] Fee ticker reflects the native currency of the source chain (e.g. `ETH` for EVM sources)
- [ ] `quote()` failure is handled gracefully (fee shows 0, not an error)

### Transfer (testnet only)

- [ ] EVM → Substrate: `transferTokens` completes without throwing; Hyperbridge indexer shows the request
- [ ] Substrate → EVM: `transferSubstrateToEvm` dispatches the transaction; the extension signing prompt appears
- [ ] Success alert is shown after both directions
- [ ] Balances refresh after a successful transfer
- [ ] EVM receipient receives the expected asset type (native ETH for `isWeth = true` tokens)

### Env var coverage

- [ ] All new `NEXT_PUBLIC_BRIDGE_*` vars are declared in `apps/hestia/next.config.js` under `env:`
- [ ] All new vars are documented in `.env.migration.example` (or equivalent)
