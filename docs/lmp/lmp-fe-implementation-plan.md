# LMP Frontend Implementation Plan
**Based on:** SOW v2 Gap Analysis — Section 4 (orderbook-fe)  
**Date:** 2026-06-02  
**Branch:** graphql-migration

---

## Current State Summary

Before building, note what already exists:

| SOW Item | Existing Asset | Gap |
|---|---|---|
| LMP hooks | `packages/core/src/hooks/lmp/` — useEpochs, useLeaderBoard, useClaimableRewards, useClaimReward, useTraderMetrics, useLmpMarkets | All poll AppSync; no REST/WS |
| Rewards route | `/app/rewards/`, `/rewards/[id]/` with Table, RewardTable, claimReward button | No Merkle proof, no tiers, no history |
| Bridge UI | `/app/bridge/` with HyperbridgeEmbed | Custom bridge flows entirely absent |
| Extrinsic signing | `helpers/signAndSendExtrinsic.ts` | No hook wrapper |
| WebSocket | `graphqlCompat.ts subscribe()` utility | No LMP-specific WS hooks |
| API client | None for REST endpoints | Both lmpApi.ts and bridgeApi.ts absent |

---

## Phase Overview

```
Phase 1 — Foundation        (F-17, F-18, F-19, F-09, F-10)  ✅ DONE
Phase 2 — LMP Dashboard     (F-01 → F-08)
Phase 3 — Custom Bridge     (F-11 → F-16 + F-15)
```

**The existing `/rewards/` route IS the LMP dashboard.** No new route is created — all LMP components slot into `rewardsPreview/template.tsx` and `rewards/template.tsx`.

Dependencies flow downward: Phase 2 components consume Phase 1 hooks/clients.  
Phase 3 is independent of Phase 2 but shares F-19 from Phase 1.

---

## Stub Mode (active for Phase 2 & 3 development)

Backend APIs are not yet live. All Phase 1 data sources use mock stubs controlled by a single env flag.

### Flag
```bash
# apps/hestia/.env.local
NEXT_PUBLIC_USE_MOCK_LMP=true
```

### How each source stubs

| Source | Stub behavior |
|---|---|
| `lmpApi.*` | Checks `NEXT_PUBLIC_USE_MOCK_LMP`; if true, returns fixtures from `mockLmpData.ts` instead of fetching |
| `useLMPLive` | If flag set, skips WebSocket and emits a new mock `LMPSnapshot` every 10 seconds via `setInterval` |
| `useAccountQScore` | If flag set, skips WebSocket and emits mock `AccountQScore` immediately, then updates every 10 seconds |
| `ClaimModal` | If flag set, simulates a 2-second delay then resolves success without submitting an extrinsic |

### Mock data location
`packages/core/src/lib/mockLmpData.ts` — single file, exports named fixtures for every type used by the above stubs.

### Removing stubs
Delete the env var. The hooks and API client automatically switch to real network calls. No code changes.

---

## Phase 1 — Foundation

### Step 1.1 — `lmpApi.ts` (F-17)

**File:** `packages/core/src/lib/lmpApi.ts`

Create a typed REST client covering all `/lmp/*` endpoints from `orderbook` server.  
Do NOT use Apollo or AppSync — these are plain HTTP REST calls to the Rust server.

```typescript
// Base URL from env (same host as GRAPHQL_URL but REST path)
const BASE = process.env.NEXT_PUBLIC_LMP_API_URL ?? process.env.NEXT_PUBLIC_GRAPHQL_URL?.replace('/graphql', '');
```

**Endpoints to implement (typed request → response):**

| Function | Method + Path | Key response fields |
|---|---|---|
| `fetchEpochs()` | `GET /lmp/epochs` | `{ epochs: Epoch[] }` |
| `fetchEpoch(epoch)` | `GET /lmp/epochs/{epoch}` | `{ epoch, startBlock, endBlock, rewardPool, pairs: EpochPair[] }` |
| `fetchLeaderboard(epoch, pair?)` | `GET /lmp/epochs/{epoch}/leaderboard` | `{ entries: LeaderboardEntry[], totalParticipants }` |
| `fetchAccountQScore(address)` | `GET /lmp/accounts/{address}/qscore` | `{ depthScore, uptimeScore, makerVolumeScore, qFinal, rank, pair, epoch }` |
| `fetchClaimableRewards(address)` | `GET /lmp/accounts/{address}/rewards/claimable` | `{ claimable: ClaimableReward[] }` where each has `{ epoch, pair, amount, merkleProof: string[], merkleLeaf }` |
| `fetchPairs()` | `GET /lmp/pairs` | `{ pairs: LMPPair[] }` where each has `{ id, tier, maxSpread, minDepth, dmmAssigned, volatilityActive }` |
| `fetchPairCalibration(pair)` | `GET /lmp/pairs/{pair}/calibration` | `{ currentSpread, recommendedSpread, adfPValue, evidence }` |
| `fetchActiveDMMs()` | `GET /lmp/dmm` | `{ assignments: DMMAssignment[] }` each with `{ pair, account, committedSpread, committedDepth, committedUptime, liveUptime }` |

**Type definitions to co-locate in `packages/core/src/types/lmp.ts`:**

```typescript
export type MarketTier = 'Tier1' | 'Tier2' | 'Tier3';

export type Epoch = {
  id: number;
  status: 'Ended' | 'Ongoing' | 'Upcoming';
  startBlock: number;
  endBlock: number;
  rewardPool: string; // raw PDEX amount (BigInt string)
  endsAt: string;    // ISO timestamp
};

export type EpochPair = {
  pair: string;
  tier: MarketTier;
  rewardPool: string;
  totalParticipants: number;
};

export type LeaderboardEntry = {
  rank: number;
  address: string;
  qFinal: string;
  depthScore: string;
  uptimeScore: string;
  makerVolume: string;
  estimatedReward: string;
};

export type ClaimableReward = {
  epoch: number;
  pair: string;
  amount: string;
  merkleProof: string[];
  merkleLeaf: string;
  claimed: boolean;
};

export type LMPPair = {
  id: string;
  tier: MarketTier;
  maxSpread: number;  // in basis points
  minDepth: string;   // raw token amount
  dmmAssigned: boolean;
  volatilityActive: boolean;
};

export type DMMAssignment = {
  pair: string;
  account: string;
  committedSpread: number;
  committedDepth: string;
  committedUptime: number;  // percentage 0-100
  liveUptime: number;
  stipend: string;
};
```

**Implementation pattern** (follow `graphqlCompat.ts` style with explicit error handling):

```typescript
async function lmpFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/lmp${path}`, {
    headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_READ_ONLY_TOKEN}` },
  });
  if (!res.ok) throw new Error(`LMP API ${path}: ${res.status}`);
  return res.json() as T;
}

export const lmpApi = {
  fetchEpochs: () => lmpFetch<{ epochs: Epoch[] }>('/epochs'),
  fetchEpoch: (epoch: number) => lmpFetch<EpochDetail>(`/epochs/${epoch}`),
  // ... rest
};
```

Export from `packages/core/src/index.ts` (check existing barrel) or `packages/core/src/lib/index.ts`.

---

### Step 1.2 — `bridgeApi.ts` (F-18)

**File:** `packages/core/src/lib/bridgeApi.ts`

```typescript
export const bridgeApi = {
  fetchSupportedAssets: () => bridgeFetch<{ assets: BridgeAsset[] }>('/supported-assets'),
  fetchDepositStatus: (txHash: string) => bridgeFetch<DepositStatus>(`/deposits/${txHash}`),
};

export type BridgeAsset = {
  assetId: string;
  symbol: string;
  name: string;
  decimals: number;
  sourceChain: string;
  contractAddress: string; // ERC-20 address
  iconUrl?: string;
};

export type DepositStatus = {
  txHash: string;
  status: 'Pending' | 'Confirmed' | 'Failed';
  validatorVotes: number;
  requiredVotes: number;
  amount: string;
  asset: string;
  recipient: string;
  estimatedCreditTime?: string;
};
```

---

### Step 1.3 — `usePolkadotExtrinsic` hook (F-19)

**File:** `packages/core/src/hooks/usePolkadotExtrinsic.ts`

A reusable hook that wraps `signAndSendExtrinsic` (already at `helpers/signAndSendExtrinsic.ts`) with React state.

```typescript
export type ExtrinsicState = 
  | { status: 'idle' }
  | { status: 'signing' }
  | { status: 'submitted'; hash: string }
  | { status: 'success'; hash: string; events: string[] }
  | { status: 'error'; error: string };

export function usePolkadotExtrinsic() {
  const { api } = useNativeApi();
  const { selectedAddresses, getSigner } = useProfile();
  const { onHandleError, onPushNotification } = useSettingsProvider();

  const [state, setState] = useState<ExtrinsicState>({ status: 'idle' });

  const submit = useCallback(async (
    buildExtrinsic: (api: ApiPromise) => SubmittableExtrinsic<'promise'>,
    options?: { successMessage?: string; waitForFinalization?: boolean }
  ) => {
    if (!api || !selectedAddresses?.mainAddress) return;
    setState({ status: 'signing' });
    try {
      const signer = await getSigner(selectedAddresses.mainAddress);
      const extrinsic = buildExtrinsic(api);
      setState({ status: 'submitted', hash: extrinsic.hash.toHex() });
      const result = await signAndSendExtrinsic(
        api, extrinsic, { signer }, selectedAddresses.mainAddress,
        options?.waitForFinalization ?? false
      );
      if (result.isSuccess) {
        setState({ status: 'success', hash: result.hash, events: result.eventMessages });
        if (options?.successMessage) onPushNotification(/* notification */);
      } else {
        throw new Error(result.eventMessages.join(', '));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setState({ status: 'error', error: msg });
      onHandleError(msg);
    }
  }, [api, selectedAddresses, getSigner, onHandleError, onPushNotification]);

  return { state, submit, reset: () => setState({ status: 'idle' }) };
}
```

Export from `packages/core/src/hooks/index.ts`.

---

### Step 1.4 — `useLMPLive` WebSocket hook (F-09)

**File:** `packages/core/src/hooks/lmp/useLMPLive.ts`

Connects to `ws://{GRAPHQL_WS_URL_BASE}/lmp/live` (plain WebSocket, NOT Apollo subscription).

```typescript
export type LMPSnapshot = {
  snapshotId: number;
  pair: string;
  epoch: number;
  topAccounts: Array<{
    address: string;
    depthScore: string;
    uptimeScore: string;
    makerVolume: string;
    qFinal: string;
  }>;
  volatilityActive: boolean;
  timestamp: string;
};

export function useLMPLive() {
  const [snapshots, setSnapshots] = useState<LMPSnapshot[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_LMP_WS_URL
      ?? process.env.NEXT_PUBLIC_GRAPHQL_WS_URL?.replace('/ws', '/lmp/live');
    if (!url) return;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (event) => {
      try {
        const snapshot: LMPSnapshot = JSON.parse(event.data);
        setSnapshots(prev => [snapshot, ...prev].slice(0, 60)); // keep last 60 snapshots
      } catch { /* ignore malformed */ }
    };

    return () => ws.close();
  }, []);

  return { snapshots, connected, latestSnapshot: snapshots[0] ?? null };
}
```

**Important:** Add reconnection with exponential backoff (max 30s) in the effect. Use a `reconnectTimeout` ref.

---

### Step 1.5 — `useAccountQScore` WebSocket hook (F-10)

**File:** `packages/core/src/hooks/lmp/useAccountQScore.ts`

```typescript
export type AccountQScore = {
  address: string;
  epoch: number;
  pair: string;
  depthScore: string;
  uptimeScore: string;
  makerVolumeScore: string;
  qFinal: string;
  rank: number;
  totalParticipants: number;
  estimatedReward: string;
  volatilityMultiplierActive: boolean;
  timestamp: string;
};

export function useAccountQScore(address: string | undefined) {
  const [qScore, setQScore] = useState<AccountQScore | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!address) return;
    const baseUrl = process.env.NEXT_PUBLIC_LMP_WS_URL
      ?? process.env.NEXT_PUBLIC_GRAPHQL_WS_URL?.replace('/ws', '');
    const url = `${baseUrl}/lmp/accounts/${address}`;

    const ws = new WebSocket(url);
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (e) => {
      try { setQScore(JSON.parse(e.data)); } catch { /* ignore */ }
    };
    return () => ws.close();
  }, [address]);

  return { qScore, connected };
}
```

Export both hooks from `packages/core/src/hooks/lmp/index.ts`.

---

## Phase 2 — LMP Dashboard Components

All components go under `apps/hestia/src/components/lmp/`.  
They slot into the existing rewards pages — `/app/rewards/` and `/app/rewards/[id]/`. No new routes.

---

### Step 2.1 — `EpochOverviewPanel` (F-01)

**File:** `apps/hestia/src/components/lmp/EpochOverviewPanel/index.tsx`

**What it shows:**
- Time remaining until epoch ends (countdown timer)
- Total PDEX reward pool for selected epoch + pair
- User's current Q-score rank (e.g. "#14 of 203 traders")
- User's estimated PDEX reward (from `estimatedReward` in `useAccountQScore`)
- Epoch number + status badge (Ongoing / Ended / Upcoming)

**Data sources:**
- `useEpochs()` (existing hook) for epoch metadata
- `useAccountQScore(mainAddress)` (Step 1.5) for rank + estimated reward
- `lmpApi.fetchEpoch(epochId)` for per-pair pool sizes

**Implementation notes:**
- Countdown uses `useEffect` + `setInterval(1000)` comparing `epoch.endsAt` with `Date.now()`.
- Format PDEX amounts using the existing `packages/format` utilities, NOT raw strings.
- Skeleton loading state while data fetches.
- When epoch status is `Upcoming`, show start countdown instead.

**Layout:** 4 stat cards in a row (responsive → 2×2 on mobile):
```
[ Epoch #42 · ONGOING ] [ Time Remaining: 14h 23m ] [ Your Rank: #14/203 ] [ Est. Reward: 120 PDEX ]
```

---

### Step 2.2 — `QScoreGauges` (F-02)

**File:** `apps/hestia/src/components/lmp/QScoreGauges/index.tsx`

**Three animated semicircular gauges:**
1. **Depth/Spread Score** — from `qScore.depthScore`
2. **Uptime Score** — from `qScore.uptimeScore`  
3. **Maker Volume Score** — from `qScore.makerVolumeScore`

**Data source:** `useAccountQScore(mainAddress)` — updates every ~60s as new snapshots arrive.

**Animation requirements:**
- Smooth arc transition when values update (CSS transition on SVG `stroke-dashoffset`).
- Color: green if score > 0.7, yellow 0.4–0.7, red < 0.4 (normalise 0–1 range).
- Each gauge shows numeric value below the arc.

**Implementation notes:**
- Use SVG arc — do NOT pull in a gauge chart library. Keep bundle lean.
- Accept `value: number` (0–1) and `label: string` props.
- Show skeleton arcs (grey, animated pulse) while `useAccountQScore` has no data.
- Real-time: `useAccountQScore` already reconnects automatically. No extra polling needed.

**Gauge SVG skeleton:**
```
   _ _ _
  /     \
 |  0.82 |   ← value
  \_____/
  Depth Score
```

---

### Step 2.3 — `MarketTierSelector` (F-03)

**File:** `apps/hestia/src/components/lmp/MarketTierSelector/index.tsx`

**Purpose:** Let users filter the leaderboard and rewards view by market tier (Tier 1 / Tier 2 / Tier 3) and see each pair's LMP parameters.

**Data source:** `lmpApi.fetchPairs()` — call this with `useQuery` following the existing hook pattern.

**UI:**
- Three tab buttons: Tier 1 / Tier 2 / Tier 3 (or "All")
- Below tabs: grid of market cards per tier, each showing:
  - Market pair name (e.g. PDEX/WETH)
  - `maxSpread`: "≤ 15 bps"
  - `minDepth`: "≥ 500 PDEX"
  - `volatilityActive`: show `VolatilityMultiplierBadge` (Step 2.4) if true
  - `dmmAssigned`: small "DMM" tag if a DMM is assigned

**Hook to create:**  
`packages/core/src/hooks/lmp/useLmpPairs.ts` — thin wrapper around `lmpApi.fetchPairs()` with `useQuery`.

**Props:**
```typescript
type Props = {
  selectedTier: MarketTier | 'All';
  onTierChange: (tier: MarketTier | 'All') => void;
  onPairSelect: (pair: string) => void;
  selectedPair?: string;
};
```

State lives in the parent page (`rewards/[id]/` template) — this is a controlled component.

---

### Step 2.4 — `VolatilityMultiplierBadge` (F-05)

**File:** `apps/hestia/src/components/lmp/VolatilityMultiplierBadge/index.tsx`

Small, self-contained badge. No external data source — receives `active: boolean` as a prop.

```typescript
type Props = { active: boolean; className?: string };
```

**When `active`:**
- Pulsing amber/orange badge: "2× Active"
- Tooltip on hover: "Volatility multiplier is active. Your Q-score contributions are doubled for snapshots during this period."

**When not `active`:** Renders nothing (return `null`).

**Used by:** `MarketTierSelector` market cards, `EpochOverviewPanel`, `LMPLeaderboard` column header.

---

### Step 2.5 — `DMMPanel` (F-06)

**File:** `apps/hestia/src/components/lmp/DMMPanel/index.tsx`

**Purpose:** Show active DMM assignments per pair — which accounts are acting as Designated Market Makers, their commitments, and real-time uptime.

**Data sources:**
- `lmpApi.fetchActiveDMMs()` — via `useQuery` hook at `packages/core/src/hooks/lmp/useDMMs.ts`
- WebSocket `ws://.../lmp/dmm/{pair}` — create `useDMMUptime(pair)` hook for real-time uptime % (same pattern as `useAccountQScore`)

**Create hook:** `packages/core/src/hooks/lmp/useDMMs.ts`

**UI — table with columns:**
| Column | Value |
|---|---|
| Pair | e.g. PDEX/WETH |
| DMM Account | truncated address |
| Committed Spread | "≤ 10 bps" |
| Committed Depth | "≥ 1000 PDEX" |
| Committed Uptime | "95%" |
| Live Uptime | progress bar (green/red vs committed) |
| Stipend | "500 PDEX / epoch" |

**Live uptime:** green bar if live ≥ committed, red if below.  
Poll every 30s via `useDMMUptime` WebSocket hook, or fallback to `refetchInterval: 30_000` in useQuery if WS endpoint not yet deployed.

---

### Step 2.6 — `LMPLeaderboard` (F-04)

**File:** `apps/hestia/src/components/lmp/LMPLeaderboard/index.tsx`

Extend the existing `rewardsPreview/TableLeaderboard` component directly — modify it in place to add the new features rather than creating a parallel component.

**What the existing component lacks:**
- Self-rank highlight (highlight logged-in user's row)
- `VolatilityMultiplierBadge` in the header when active
- Q-score breakdown columns (depth, uptime, volume separately)
- Top 20 cap (existing may show all)

**Data source:**
- `lmpApi.fetchLeaderboard(epoch, pair)` — via new `useLMPLeaderboard(epoch, pair)` hook in `packages/core/src/hooks/lmp/useLMPLeaderboard.ts`
- Refresh interval: 60s (`refetchInterval: 60_000`)

**Create hook:** `packages/core/src/hooks/lmp/useLMPLeaderboard.ts`

**Props:**
```typescript
type Props = {
  epoch: number;
  pair: string;
  currentUserAddress?: string;
};
```

**Table columns:** Rank | Address | Depth Score | Uptime Score | Maker Volume | Q-Final | Est. Reward

**Self-rank behaviour:** if `entry.address === currentUserAddress`, highlight the row (e.g. amber border/background). If user is not in top 20, append a sticky bottom row showing their rank (e.g. "You — #47 of 203").

---

### Step 2.7 — `LMPHistoryTab` (F-07)

**File:** `apps/hestia/src/components/lmp/LMPHistoryTab/index.tsx`

**Purpose:** Show the logged-in user's history across past epochs: Q-score achieved, rewards earned, claimed vs unclaimed, DMM stipends.

**Data sources:**
- `lmpApi.fetchClaimableRewards(address)` — existing F-17, returns `claimed` boolean per entry
- `lmpApi.fetchEpochs()` — for epoch list to cross-reference

**Create hook:** `packages/core/src/hooks/lmp/useLMPHistory.ts` — merges epoch list with reward history.

**UI — tabs within the component:**
- **Rewards Tab:** Table with columns: Epoch | Pair | Q-Score | Reward Earned | Status (Claimed / Claimable → button) | Tx Hash
- **Stipends Tab:** (if user was a DMM) Epoch | Pair | Committed Uptime | Actual Uptime | Stipend | Status

**"Claimable" status:** renders a `ClaimModal` trigger button (Step 2.8).  
**"Claimed" status:** shows checkmark + truncated tx hash link.

**Empty state:** "No LMP participation history yet. Start market making to earn rewards."

---

### Step 2.8 — `ClaimModal` (F-08)

**File:** `apps/hestia/src/components/lmp/ClaimModal/index.tsx`

Replaces the existing `rewardsPreview/TableRewards/claimReward.tsx` button — update that file to open this modal instead of directly triggering the claim.

**Flow:**
1. User clicks "Claim" → modal opens
2. Modal fetches Merkle proof from `lmpApi.fetchClaimableRewards(address)` (already has proof data)
3. Shows: Epoch #, Pair, Amount (formatted PDEX), Merkle proof summary (leaf hash, first/last proof bytes)
4. "Confirm Claim" button → calls `usePolkadotExtrinsic` (Step 1.3) to submit `api.tx.ocex.claimRewards(epoch, amount, merkleProof)`
5. Loading state: spinner + "Waiting for signature..."
6. Success state: checkmark + tx hash
7. Error state: error message + retry button

**Extrinsic construction:**
```typescript
submit((api) =>
  api.tx.ocex.claimRewards(
    reward.epoch,
    api.createType('u128', BigInt(reward.amount)),
    reward.merkleProof
  )
);
```

**Props:**
```typescript
type Props = {
  reward: ClaimableReward;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // to trigger cache invalidation
};
```

**Cache invalidation on success:** call `queryClient.invalidateQueries` for `lmpRewards` and `lmpHistory` query keys.

---

### Step 2.9 — Integrate LMP components into the existing rewards pages

The rewards route already has the right structure. These are surgical additions:

**`apps/hestia/src/components/rewardsPreview/template.tsx`** (market detail page):
```
Current layout:     Overview + TableLeaderboard + TableRewards

Updated layout:
  EpochOverviewPanel          ← replaces Overview section (Step 2.1)
  MarketTierSelector          ← new, above leaderboard (Step 2.3)
  QScoreGauges                ← new, inside EpochOverviewPanel or below it (Step 2.2)
  TableLeaderboard (modified) ← add self-rank highlight + Q-score columns (Step 2.6)
  VolatilityMultiplierBadge   ← inline in the header when active (Step 2.4)
  DMMPanel                    ← new collapsible section below leaderboard (Step 2.5)
  LMPHistoryTab               ← new tab added alongside TableRewards (Step 2.7)
  ClaimModal                  ← claimReward.tsx updated to open this (Step 2.8)
```

Pass `mainAddress` from `useProfile()` down to all components that need the current user's address.

**`apps/hestia/src/components/rewards/template.tsx`** (epoch list page):
- Add `MarketTierSelector` as a filter above the epoch table — controls which tier's markets are shown.
- The tab-based epoch carousel and table structure stay unchanged.

---

## Phase 3 — Bridge Gaps

The bridge is **fully implemented** using the Hyperbridge SDK (not a stub embed). The plan's original assumption that the route used `HyperbridgeEmbed` was wrong — `HyperbridgeEmbed.tsx` exists but is unused. The live implementation uses `BridgeProvider` + `Form` + `ethereumToSubstrate.ts` / `substrateToEthereum.ts` directly.

### What already exists (no work needed)

| SOW Item | Existing Asset | Status |
|---|---|---|
| F-15 Ethereum wallet | `wagmi@2.12.7`, `viem@2.21.19`, `@web3modal/wagmi@5.1.11` installed; `wagmi.ts` configures Web3Modal with injected + WalletConnect; `bridge/layout.tsx` scopes it to the route | ✅ DONE |
| F-11 Deposit flow | `Form/index.tsx` + `confirmTransaction.tsx` + `ethereumToSubstrate.ts`: asset select, amount input, fee estimation (`useHyperbridgeFees`), ERC-20 approve, `tokenGateway.teleport()` call, tx hash display | ✅ DONE |
| F-12 Withdrawal flow | Same `Form` + `substrateToEthereum.ts`: Polkadot extension connect, `teleport()` via Hyperbridge SDK, Polkadex tx hash display | ✅ DONE |
| F-16 Confirmation modal | `confirmTransaction.tsx`: fee breakdown, terms checkbox, source/destination accounts, never auto-submits | ✅ DONE |
| Bridge config | `apps/hestia/src/config/bridge.ts`: chain/token/route config, all env vars wired | ✅ DONE |
| Form validation | `bridgeValidations()` in `packages/core/src/validations/index.ts`: full Yup schema including existential deposit check | ✅ DONE |

### What is still missing

Three gaps remain from the SOW:

1. **F-13 `BridgeStatus`** — no validator vote progress UI after a transfer is submitted
2. **F-14 `BridgeTransactionHistory`** — no in-app history; Help section links to `/history?tab=crossChain` but bridge transfers are not tracked there
3. **`bridgeApi.ts` mock stubs** — the client exists but has no mock mode; status polling cannot be developed without it

Additionally two minor gaps worth noting but lower priority:
- Substrate→EVM fee estimation always shows 0 (only EVM→Substrate direction is estimated by `useHyperbridgeFees`)
- Asset selection in `BridgeProvider` is hardcoded to WETH; `onSelectAsset()` is a no-op stub

---

### Step 3.1 — Add mock stubs to `bridgeApi.ts`

**File:** `packages/core/src/lib/bridgeApi.ts`

Extend the existing file with the same mock pattern used in `lmpApi.ts`. Add a `isMockBridgeEnabled()` helper and mock fixtures.

```typescript
// In mockLmpData.ts (or a new mockBridgeData.ts):
export const MOCK_BRIDGE_ASSETS = [
  { assetId: "1", symbol: "WETH", name: "Wrapped Ether", decimals: 18,
    sourceChain: "sepolia", contractAddress: "0x7b79995e5f793a07bc00c21412e50ecae098e7f9" },
];

export const MOCK_DEPOSIT_STATUS_PENDING: DepositStatus = {
  txHash: "0xabc123",
  status: "Pending",
  validatorVotes: 2,
  requiredVotes: 5,
  amount: "1000000000000000000",
  asset: "WETH",
  recipient: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  estimatedCreditTime: "2026-06-03T12:00:00Z",
};
```

`bridgeApi.fetchSupportedAssets()` and `bridgeApi.fetchDepositStatus()` check `NEXT_PUBLIC_USE_MOCK_LMP` (reuse the existing flag — no new env var needed) and return mock data.

For `fetchDepositStatus` in mock mode: use a deterministic progression — calls within the first 30 seconds return `Pending` (votes 2/5), after 30s return `Pending` (votes 4/5), after 60s return `Confirmed`. Base time on `Date.now() - txSubmitTime` which can be encoded in the mock txHash or a module-level timestamp.

---

### Step 3.2 — `BridgeStatus` component (F-13)

**File:** `apps/hestia/src/components/bridge/BridgeStatus/index.tsx`

Post-submission tracking panel that displays validator vote progress for a pending transfer.

**Props:**
```typescript
type Props = {
  txHash: string;
  mode: 'deposit' | 'withdrawal';
  onDone?: () => void;
};
```

**New hook:** `packages/core/src/hooks/bridge/useBridgeDepositStatus.ts`
```typescript
export function useBridgeDepositStatus(txHash: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.bridgeDepositStatus(txHash ?? ""),
    queryFn: () => bridgeApi.fetchDepositStatus(txHash!),
    enabled: !!txHash,
    refetchInterval: (data) =>
      data?.status === "Pending" ? 15_000 : false, // stop polling once resolved
  });
}
```

**UI elements:**
- Validator vote progress bar: `validatorVotes / requiredVotes` with numeric label ("3 of 5 validators confirmed")
- Status badge: Pending (amber, pulsing dot) / Confirmed (green) / Failed (red)
- Ethereum tx hash (deposit) or Polkadex tx hash (withdrawal) — truncated, links to Subscan / Etherscan
- Estimated credit time when available
- On Confirmed: "Funds credited to your account" message, `onDone` callback fires to dismiss or transition
- On Failed: error message, link to Discord support

Add `QUERY_KEYS.bridgeDepositStatus(txHash: string)` to `packages/core/src/constants/queryKeys.ts`.

**Where it's mounted:** Inside `confirmTransaction.tsx` — after a successful `transferTokens()` or `transferSubstrateToEvm()` call the modal transitions from "success" state to showing `BridgeStatus`. The tx hash comes from the Hyperbridge SDK response. Do not create a new page or route.

---

### Step 3.3 — `BridgeTransactionHistory` component + hook (F-14)

No server history endpoint exists. Use `localStorage` keyed by Polkadex address.

**New hook:** `packages/core/src/hooks/bridge/useBridgeHistory.ts`

```typescript
export type BridgeHistoryEntry = {
  id: string;
  type: 'deposit' | 'withdrawal';
  txHash: string;
  asset: string;
  amount: string;         // raw token amount string (formatted at view layer)
  decimals: number;
  status: 'Pending' | 'Confirmed' | 'Failed';
  timestamp: number;      // Unix ms
};

export function useBridgeHistory(address: string | undefined) {
  const storageKey = address ? `bridge_history_${address}` : null;

  const [history, setHistory] = useState<BridgeHistoryEntry[]>(() => {
    if (!storageKey || typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem(storageKey) ?? '[]'); }
    catch { return []; }
  });

  const addEntry = useCallback((entry: BridgeHistoryEntry) => {
    if (!storageKey) return;
    setHistory(prev => {
      const next = [entry, ...prev].slice(0, 50);
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }, [storageKey]);

  const updateStatus = useCallback((txHash: string, status: BridgeHistoryEntry['status']) => {
    if (!storageKey) return;
    setHistory(prev => {
      const next = prev.map(e => e.txHash === txHash ? { ...e, status } : e);
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }, [storageKey]);

  return { history, addEntry, updateStatus };
}
```

**File:** `apps/hestia/src/components/bridge/BridgeTransactionHistory/index.tsx`

**UI:** A collapsible panel (or dedicated section) below the bridge form on the `/bridge/` page:
- Table with columns: Direction | Asset | Amount | Status | Time | →
- Status column: badge (Pending/Confirmed/Failed)
- "→" opens an inline detail panel showing `BridgeStatus` for that tx hash
- Empty state: "No transfers yet. Your transaction history is stored locally."
- SSR safety: `typeof window === 'undefined'` guard; render after mount only

**Wiring into template:**
`apps/hestia/src/components/bridge/template.tsx` — import and render `BridgeTransactionHistory` below `Form`. Pass `mainAddress` from `useProfile()`. When `Form`/`confirmTransaction` completes a transfer, call `addEntry()` on the history hook (pass down via prop or a shared context).

The cleanest pattern: `BridgeProvider` already holds the transfer state. Add an `onTransferComplete(entry: BridgeHistoryEntry) => void` callback prop to `BridgeLayout` that the template wires to `addEntry`.

---

### Step 3.4 — Minor gap: Substrate→EVM fee estimation

**File:** `apps/hestia/src/lib/hyperbridge/useHyperbridgeFees.ts`

Currently `useHyperbridgeFees` only estimates fees for EVM→Substrate direction. When direction is Substrate→EVM, the `ConfirmTransaction` modal shows `destinationFee: 0`.

Fix: when `isEvmSource === false`, query the Hyperbridge indexer or use a fixed placeholder fee from `bridge.ts` config. The Hyperbridge SDK may expose a `quoteNative` for the reverse direction — check SDK types first; if not available, show a static estimated fee with a disclaimer ("estimated, subject to change").

This is a polish fix, not a blocker. Lower priority than F-13 and F-14.

---

## Environment Variables to Add

Add these to `.env.migration.example` (and document in CLAUDE.md):

```bash
# LMP REST API base URL (usually same host as GRAPHQL_URL without /graphql)
NEXT_PUBLIC_LMP_API_URL=

# LMP WebSocket base URL for live feeds
NEXT_PUBLIC_LMP_WS_URL=
```

All bridge env vars are already present in the codebase (`NEXT_PUBLIC_BRIDGE_SEPOLIA_RPC_URL`, `NEXT_PUBLIC_BRIDGE_TOKEN_GATEWAY_ADDRESS`, `NEXT_PUBLIC_BRIDGE_WETH_ADDRESS`, `NEXT_PUBLIC_BRIDGE_DESTINATION_RPC_URL`, `NEXT_PUBLIC_BRIDGE_INDEXER_URL`, `NEXT_PUBLIC_PROJECT_ID`). No new bridge env vars needed.

---

## New Files Checklist

```
packages/core/src/
├── lib/
│   ├── lmpApi.ts                           # F-17 ✅ DONE
│   ├── bridgeApi.ts                        # F-18 ✅ DONE (needs mock stubs added — Step 3.1)
│   └── mockLmpData.ts                      # stub fixtures ✅ DONE (needs bridge fixtures added)
└── hooks/
    ├── usePolkadotExtrinsic.ts             # F-19 ✅ DONE
    ├── lmp/
    │   ├── useLMPLive.ts                   # F-09 ✅ DONE
    │   ├── useAccountQScore.ts             # F-10 ✅ DONE
    │   ├── useLmpPairs.ts                  # ✅ DONE
    │   ├── useLMPLeaderboard.ts            # ✅ DONE
    │   ├── useDMMs.ts                      # ✅ DONE
    │   └── useLMPHistory.ts               # ✅ DONE
    └── bridge/
        ├── useBridgeDepositStatus.ts       # F-13 — NEW (Step 3.2)
        └── useBridgeHistory.ts             # F-14 — NEW (Step 3.3)

apps/hestia/src/
├── providers/
│   └── (wagmi already wired into bridge/layout.tsx via wagmi.ts) # F-15 ✅ DONE
├── components/
│   ├── lmp/
│   │   ├── EpochOverviewPanel/index.tsx   # F-01 ✅ DONE
│   │   ├── QScoreGauges/index.tsx         # F-02 ✅ DONE
│   │   ├── MarketTierSelector/index.tsx   # F-03 ✅ DONE
│   │   ├── LMPLeaderboard/index.tsx       # F-04 ✅ DONE
│   │   ├── VolatilityMultiplierBadge/
│   │   │   └── index.tsx                  # F-05 ✅ DONE
│   │   ├── DMMPanel/index.tsx             # F-06 ✅ DONE
│   │   ├── LMPHistoryTab/index.tsx        # F-07 ✅ DONE
│   │   └── ClaimModal/index.tsx           # F-08 ✅ DONE
│   └── bridge/
│       ├── (Form, BridgeProvider, confirmTransaction, etc.) # F-11, F-12, F-16 ✅ DONE
│       ├── BridgeStatus/index.tsx          # F-13 — NEW (Step 3.2)
│       └── BridgeTransactionHistory/
│           └── index.tsx                   # F-14 — NEW (Step 3.3)
```

---

## Implementation Order & Dependencies

```
Phase 1 & 2: ✅ COMPLETE

Phase 3 remaining work (bridge gaps only):

  Step 3.1  Add mock stubs to bridgeApi.ts + mockLmpData.ts
              — unblocks local dev of BridgeStatus without a live backend

  Step 3.2  useBridgeDepositStatus hook + BridgeStatus component (F-13)
              — needs Step 3.1 mock stubs first
              — wire into confirmTransaction.tsx post-success state

  Step 3.3  useBridgeHistory hook + BridgeTransactionHistory component (F-14)
              — wire into bridge/template.tsx below Form
              — call addEntry() from confirmTransaction.tsx on transfer success

  Step 3.4  (optional) Substrate→EVM fee estimation fix
              — update useHyperbridgeFees to handle reverse direction
```

---

## Critical Implementation Rules

These rules come from the existing CLAUDE.md and apply to all new code:

1. **All PDEX/token amounts:** Format at the view layer only. Pass raw `BigInt` strings between components. Never format before storing in state.
2. **Arithmetic:** Use `BigInt` or `Decimal.js` (check existing deps). Never use JS `number` for token amounts.
3. **New GraphQL operations:** If any future LMP data comes via GraphQL subscription, use `sendQuery()` / `subscribe()` from `graphqlCompat.ts`.
5. **WS reconnection:** Both `useLMPLive` and `useAccountQScore` must implement reconnect with exponential backoff. Users will have long-lived sessions.
6. **No auto-submit:** Every on-chain action (claim, deposit, withdraw) must go through a confirmation step. Never submit extrinsics or EVM transactions without explicit user confirmation.
7. **Merkle proof verification:** The proof is verified on-chain by `claim_rewards` extrinsic — the frontend does NOT need to verify it, but must pass it correctly as a `Vec<H256>` (array of `0x`-prefixed hex strings).

---

## Backend Coordination Dependencies

These frontend items are blocked until backend delivers the corresponding API/endpoint:

| Frontend Step | Blocked by | Backend Item |
|---|---|---|
| lmpApi.fetchLeaderboard | REST endpoint | E-31 |
| lmpApi.fetchAccountQScore | REST endpoint | E-32 |
| lmpApi.fetchClaimableRewards (with Merkle proof) | Merkle proof generation | E-33 + E-20 |
| lmpApi.fetchPairs (with tier) | Tier system on chain | C-01, C-62, E-34 |
| lmpApi.fetchActiveDMMs | DMM system on chain | C-09–C-13, E-36 |
| useLMPLive WebSocket | WS feed live | E-39 |
| useAccountQScore WebSocket | WS feed live | E-40 |
| ClaimModal extrinsic | claim_rewards extrinsic | C-22 |
| BridgeDepositFlow lock() | Bridge contract deployed | B-01 |
| BridgeWithdrawFlow initiate_withdrawal | Bridge pallet | C-53 |
| BridgeStatus validator votes | Bridge deposit endpoint | E-38 |

**Build stubs/mocks** for all these during development. Use `USE_NEW_BACKEND` env pattern as precedent — add a `USE_MOCK_LMP` flag that returns hardcoded fixtures so UI can be built and tested before backend is ready.
