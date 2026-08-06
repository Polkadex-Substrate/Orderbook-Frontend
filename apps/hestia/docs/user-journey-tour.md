# User Journey Tour — Implementation Guide

This document describes how the product tour system works in Polkadex Orderbook Frontend. It covers the library, architecture, decision logic, all step definitions, theming, and how to extend or reset the tour.

---

## Library

**[Driver.js](https://driverjs.com) v1.6.0** — a lightweight, zero-dependency JavaScript library for step-by-step product tours and element highlights. It renders a translucent overlay, cuts out the highlighted element, and positions a customisable popover next to it.

Installed as a workspace-root dependency:

```
driver.js ^1.6.0   (node_modules/driver.js)
```

Declared in `apps/hestia/package.json`.

---

## File Map

```
apps/hestia/
├── src/
│   ├── config/tours/
│   │   ├── tradingTour.ts        # 7 interface-explanation steps (exported individually)
│   │   └── onboardingTour.ts     # 3 setup-phase step sets for incomplete-setup users
│   ├── hooks/
│   │   └── useTour.ts            # Central hook — reads wallet state, picks tour, auto-starts
│   ├── styles/
│   │   ├── globals.scss          # Imports driver.js CSS + tour.css
│   │   └── tour.css              # Polkadex dark-theme overrides for all Driver.js classes
│   └── components/
│       ├── trading/
│       │   ├── template.tsx      # Calls useTour(), renders the floating ? button
│       │   ├── AssetInfo/index.tsx       # data-tour="market-selector"
│       │   ├── Graph/index.tsx           # data-tour="price-chart"
│       │   ├── Orderbook/index.tsx       # data-tour="orderbook"
│       │   ├── Trades/index.tsx          # data-tour="recent-trades"
│       │   ├── PlaceOrder/index.tsx      # data-tour="place-order"
│       │   └── Orders/index.tsx          # data-tour="orders-panel"
│       └── ui/
│           └── Header/
│               ├── index.tsx             # data-tour="header"
│               └── Profile/index.tsx     # data-tour="connect-wallet-btn" / "fund-account-btn"
└── docs/
    └── user-journey-tour.md      # This file
```

---

## How the Tour is Triggered

### Auto-start (first visit)

`useTour` is mounted inside `Template` (`apps/hestia/src/components/trading/template.tsx`), which renders on every visit to `/trading/[id]`. On mount it checks `localStorage`:

```
localStorage.getItem("trading-tour-v1")
```

- **Key absent** → after a 900 ms delay (providers settle), the hook reads the current wallet connection state and starts the appropriate tour.
- **Key present** → no auto-start. The key is written when the user closes or completes any tour.

### Manual replay

A pink `?` button is fixed at the bottom-right of the trading page. Clicking it always launches the **full trading interface tour** (7 steps) regardless of connection state, and does not write or read the localStorage key — it is purely on-demand.

```tsx
// apps/hestia/src/components/trading/template.tsx
<button onClick={startTour} ...>?</button>
```

---

## data-tour Anchor System

Driver.js targets DOM elements via CSS selectors. All tour targets use `data-tour` attributes — plain HTML attributes that add no styling and carry no logic. They are the single source of truth between the step config files and the component tree.

| Attribute | Component file | Visible when |
|---|---|---|
| `data-tour="header"` | `Header/index.tsx` | Always |
| `data-tour="connect-wallet-btn"` | `Header/Profile/index.tsx` | Wallet **not** connected |
| `data-tour="fund-account-btn"` | `Header/Profile/index.tsx` | Wallet **connected** |
| `data-tour="market-selector"` | `trading/AssetInfo/index.tsx` | Always |
| `data-tour="price-chart"` | `trading/Graph/index.tsx` | Always |
| `data-tour="orderbook"` | `trading/Orderbook/index.tsx` | Tablet + Desktop (≥ 954 px) |
| `data-tour="recent-trades"` | `trading/Trades/index.tsx` | Desktop only (≥ 1280 px) |
| `data-tour="place-order"` | `trading/PlaceOrder/index.tsx` | Always |
| `data-tour="orders-panel"` | `trading/Orders/index.tsx` | Always |

`connect-wallet-btn` and `fund-account-btn` are **mutually exclusive** — only one renders at a time, depending on whether a Polkadot extension account is present. The tour logic accounts for this when selecting steps.

---

## Tour Decision Logic

`useTour` reads three values from `useConnectWalletProvider`:

| Variable | Type | Meaning |
|---|---|---|
| `extensionAccountPresent` | `boolean` | A Polkadot extension account (funding wallet) is selected |
| `mainProxiesAccounts` | `string[]` | Proxy/trading accounts registered on-chain for this funding wallet |
| `selectedTradingAccount` | `object \| undefined` | The trading account currently active in this browser session |

The decision tree runs after the 900 ms delay:

```
extensionAccountPresent  AND  selectedTradingAccount present?
  YES  →  Trading Interface Tour  (7 steps)
  NO   →  Onboarding Tour  (phase depends on sub-state)
             ├── !extensionAccountPresent              → Phase A
             ├── extensionAccountPresent, no proxies   → Phase B
             └── extensionAccountPresent, has proxies  → Phase C
```

The stale-closure problem is avoided by keeping a `stateRef` that is updated in a separate `useEffect` whenever provider state changes:

```ts
const stateRef = useRef({ extensionAccountPresent, mainProxiesAccounts, selectedTradingAccount });
useEffect(() => {
  stateRef.current = { extensionAccountPresent, mainProxiesAccounts, selectedTradingAccount };
}, [extensionAccountPresent, mainProxiesAccounts, selectedTradingAccount]);
```

The auto-start `useEffect` has `[]` deps (runs once on mount) and reads `stateRef.current` inside the timeout callback, guaranteeing it sees the latest hydrated values.

---

## Tour A — Trading Interface Tour

**File:** `apps/hestia/src/config/tours/tradingTour.ts`

**Triggered when:** User is fully set up (funding wallet + trading account both active), OR via the manual `?` button at any time.

**Purpose:** Explain what each panel of the trading UI does. Not about setup — assumes the user is ready to trade.

### Steps by viewport

| # | Target | Title | Desktop (≥ 1280) | Tablet (954–1279) | Mobile (< 954) |
|---|---|---|:---:|:---:|:---:|
| 1 | `[data-tour="header"]` | Navigation Bar | ✓ | ✓ | ✓ |
| 2 | `[data-tour="market-selector"]` | Market Selector | ✓ | ✓ | ✓ |
| 3 | `[data-tour="price-chart"]` | Price Chart | ✓ | ✓ | ✓ |
| 4 | `[data-tour="orderbook"]` | Order Book | ✓ | ✓ | — |
| 5 | `[data-tour="recent-trades"]` | Markets & Recent Trades | ✓ | — | — |
| 6 | `[data-tour="place-order"]` | Place an Order | ✓ | ✓ | ✓ |
| 7 | `[data-tour="orders-panel"]` | Your Activity | ✓ | ✓ | ✓ |

### Step descriptions

**1 — Navigation Bar**
> Access all sections of Polkadex: Trade, Bridge, Rewards, Faucet, and community links. Connect your wallet from the top-right.

**2 — Market Selector**
> Your active trading pair is shown here with live price, 24h change, high/low, and volume. Click the pair name to browse all available markets.

**3 — Price Chart**
> Candlestick chart with OHLCV data. Hover over any candle to inspect open, high, low, and close values in the legend overlay.

**4 — Order Book** *(tablet + desktop)*
> Live buy (green) and sell (red) orders sorted by price. Click any row to automatically prefill that price in the order form.

**5 — Markets & Recent Trades** *(desktop only)*
> Switch between Markets — a list of all trading pairs — and Recent Trades, showing the latest executions on the current pair in real time.

**6 — Place an Order**
> Choose Limit (set your price) or Market (execute instantly at the best available price). Connect your wallet and fund your trading account to start.

**7 — Your Activity**
> Track Open Orders, Order History, Trade History, and Balances — all in one panel. Filters let you view only buys or sells within a custom date range.

---

## Tour B — Onboarding Tour

**File:** `apps/hestia/src/config/tours/onboardingTour.ts`

**Triggered when:** User has not been seen before (no localStorage key) AND is not fully set up.

**Purpose:** Guide the user through the 3-step setup process before they can trade. The tour is *educational* — it points to areas and describes what to do; it does not force the user to complete steps during the tour itself. After dismissing, the user follows the natural UI flow (wallet modal, trading account creation, fund modal).

Every phase ends by appending the same set of interface-explanation steps so the user also gets oriented to the trading UI in one go.

### Phase A — No wallet connected

**Condition:** `extensionAccountPresent === false`

Steps on **desktop** (9 total):

| # | Target | Title |
|---|---|---|
| 1 | `[data-tour="header"]` | Welcome to Polkadex Orderbook |
| 2 | `[data-tour="connect-wallet-btn"]` | Step 1 — Connect Your Funding Wallet |
| 3 | `[data-tour="orders-panel"]` | Step 2 — Create a Trading Account |
| 4 | `[data-tour="place-order"]` | Step 3 — Fund & Trade |
| 5 | `[data-tour="market-selector"]` | Market Selector |
| 6 | `[data-tour="price-chart"]` | Price Chart |
| 7 | `[data-tour="orderbook"]` | Order Book |
| 8 | `[data-tour="recent-trades"]` | Markets & Recent Trades |
| 9 | `[data-tour="place-order"]` | Place an Order |

**Step descriptions (setup phase):**

**1 — Welcome to Polkadex Orderbook**
> A fully non-custodial DEX built on Polkadex Chain. Let's walk through 3 steps to get you trading: connect your wallet, create a trading account, and fund it.

**2 — Step 1: Connect Your Funding Wallet** → points to `connect-wallet-btn`
> Click 'Connect wallet' to link your Polkadot extension (Polkadot.js, Talisman, or SubWallet). Select the account that holds your PDEX tokens — this becomes your main on-chain account.

**3 — Step 2: Create a Trading Account** → points to `orders-panel`
> After connecting, you'll be guided to create a Trading Account — a lightweight on-chain proxy that executes orders on your behalf without gas fees. Requires a small PDEX deposit from your funding wallet.

**4 — Step 3: Fund & Trade** → points to `place-order`
> Once your trading account is created, click 'Fund Account' (top-right) to deposit tokens. You can bridge from another chain, transfer from your Polkadex wallet, or use a CEX on-ramp. Then use this form to place your first order!

---

### Phase B — Wallet connected, no proxy accounts

**Condition:** `extensionAccountPresent === true` AND `mainProxiesAccounts.length === 0`

This user has connected their Polkadot extension but hasn't created a trading (proxy) account yet.

Steps on **desktop** (7 total):

| # | Target | Title |
|---|---|---|
| 1 | `[data-tour="orders-panel"]` | Create a Trading Account |
| 2 | `[data-tour="fund-account-btn"]` | Fund Your Trading Account |
| 3 | `[data-tour="market-selector"]` | Market Selector |
| 4 | `[data-tour="price-chart"]` | Price Chart |
| 5 | `[data-tour="orderbook"]` | Order Book |
| 6 | `[data-tour="recent-trades"]` | Markets & Recent Trades |
| 7 | `[data-tour="place-order"]` | Place an Order |

**Step descriptions (setup phase):**

**1 — Create a Trading Account** → points to `orders-panel`
> Your funding wallet is connected. Next, create a Trading Account — a proxy that executes trades on Polkadex without gas fees. You'll be prompted automatically, or find the option in your profile (top-right).

**2 — Fund Your Trading Account** → points to `fund-account-btn`
> Once your trading account is created, click here to transfer tokens to it. Choose between Bridge (cross-chain), Transfer (already on Polkadex), or CEX On-Ramp.

---

### Phase C — Proxy accounts exist, none active in browser

**Condition:** `extensionAccountPresent === true` AND `mainProxiesAccounts.length > 0` AND `selectedTradingAccount === undefined`

This user registered trading accounts on-chain previously but hasn't loaded one into this browser session (e.g. switched browser, cleared storage, or came back after using a different machine).

Steps on **desktop** (7 total):

| # | Target | Title |
|---|---|---|
| 1 | `[data-tour="orders-panel"]` | Connect Your Trading Account |
| 2 | `[data-tour="fund-account-btn"]` | Transfer to Start Trading |
| 3 | `[data-tour="market-selector"]` | Market Selector |
| 4 | `[data-tour="price-chart"]` | Price Chart |
| 5 | `[data-tour="orderbook"]` | Order Book |
| 6 | `[data-tour="recent-trades"]` | Markets & Recent Trades |
| 7 | `[data-tour="place-order"]` | Place an Order |

**Step descriptions (setup phase):**

**1 — Connect Your Trading Account** → points to `orders-panel`
> You have a registered trading account. Click 'Connect Trading Account' here (or go to your profile at top-right) to activate it for this session.

**2 — Transfer to Start Trading** → points to `fund-account-btn`
> Need to top up? Click 'Fund Account' to deposit tokens into your trading account. Use 'Transfer to trading account' for assets already on Polkadex, or Bridge for cross-chain transfers.

---

## Complete User Account Journey

Below is the full real-world flow a brand-new user goes through after arriving at the trading page. The tour guides steps 1–6; steps 7 onward happen naturally via the UI.

```
1. Arrive at /trading/[id]
   └─ Tour auto-starts (Phase A) — explains what to do

2. Click "Connect wallet" (highlighted by tour)
   └─ ConnectWalletInteraction modal opens
   └─ User selects extension (Polkadot.js / Talisman / SubWallet)
   └─ Extension prompt: authorise the site

3. Select a funding account (extension account list shown in modal)
   └─ mainAddress is stored in ProfileProvider
   └─ App queries on-chain for existing proxy/trading accounts

4. Create a Trading Account (guided by modal)
   ├─ If no proxies exist: modal shows "Create Trading Account" flow
   │   └─ Account name + mnemonic generated
   │   └─ Optional password protection
   │   └─ On-chain proxy registration transaction signed by funding wallet
   │   └─ selectedTradingAccount is populated
   └─ If proxies exist: modal shows "Select Trading Account"

5. Fund the Trading Account
   └─ User clicks "Fund Account" button (highlighted by tour)
   └─ FundWalletModal opens with 4 options:
       ├─ Bridge         → /bridge  (cross-chain assets)
       ├─ Transfer       → /transfer/PDEX?type=deposit  (Polkadex assets)
       ├─ CEX On-Ramp    → /cexOnRamp  (Kucoin / Gate.io via cede.store)
       └─ Credit card    → Simplex partner link

6. Transfer funds to trading account (/transfer/PDEX?type=deposit)
   └─ Enter amount → sign with funding wallet → tokens arrive in trading account

7. Return to /trading/[id]
   └─ Orders panel now shows real data (open orders, balances)
   └─ PlaceOrder form is fully active

8. Place a Limit or Market order
   └─ Limit: set price + amount → submit → order enters order book
   └─ Market: set amount only → executes immediately at best price
   └─ Order appears in "Open Orders" tab
   └─ On fill: moves to "Order History" and "Trade History"
```

---

## Driver.js Configuration

All tours share one base configuration object defined in `useTour.ts`:

```ts
const BASE_CONFIG = {
  showProgress: true,          // "1 / 7" counter
  progressText: "{{current}} / {{total}}",
  animate: true,               // smooth element transitions
  smoothScroll: true,          // scroll page to bring element into view
  allowClose: true,            // clicking the overlay or × closes the tour
  overlayOpacity: 0.65,
  stagePadding: 6,             // px gap between highlighted element and cutout edge
  stageRadius: 6,              // px border-radius of the cutout
  popoverClass: "polkadex-tour-popover",  // hooks into tour.css overrides
  nextBtnText: "Next →",
  prevBtnText: "← Back",
  doneBtnText: "Done",
};
```

Driver.js is dynamically imported (`await import("driver.js")`) on first use, so it does not appear in the initial JS bundle.

`onDestroyed` callback writes the localStorage key once the tour instance is cleaned up (covers both completion and early dismiss):

```ts
onDestroyed: () => {
  localStorage.setItem("trading-tour-v1", "true");
},
```

---

## Theming

**File:** `apps/hestia/src/styles/tour.css`  
**Imported in:** `apps/hestia/src/styles/globals.scss`

All overrides target `.driver-popover.polkadex-tour-popover` to scope changes to this popover class only, leaving any other Driver.js instances on the page unaffected.

| CSS target | Property | Value |
|---|---|---|
| `.driver-popover` | background | `#111318` |
| `.driver-popover` | border | `1px solid rgba(255,255,255,0.08)` |
| `.driver-popover` | box-shadow | `0 24px 64px rgba(0,0,0,0.7)` |
| `.driver-popover-title` | color | `#ffffff`, weight 600 |
| `.driver-popover-description` | color | `#8b929e` |
| `.driver-popover-next-btn` | background | `#E6007A` (Polkadex brand pink) |
| `.driver-popover-prev-btn` | background | transparent, border `rgba(255,255,255,0.1)` |
| `.driver-overlay` | background | `rgba(0,0,0,0.65)` |
| `.driver-active-element` | outline | `2px solid rgba(230,0,122,0.5)` |
| Arrow sides (4×) | border color | `#111318` (matches popover bg) |

---

## LocalStorage Key

| Key | Written | Read | Cleared |
|---|---|---|---|
| `trading-tour-v1` | On tour close/complete (`onDestroyed`) | On every mount of `Template` | Manually (for testing) |

Versioning: if the tour steps change significantly, increment the key suffix (`trading-tour-v2`) so returning users see the updated tour.

---

## How to Add a New Step

1. **Add a `data-tour` attribute** to the target element in its component file:
   ```tsx
   <div data-tour="my-new-feature" className="...">
   ```

2. **Define the step** in the appropriate tour file:
   ```ts
   // tradingTour.ts or onboardingTour.ts
   export const myNewStep: DriveStep = {
     element: '[data-tour="my-new-feature"]',
     popover: {
       title: "New Feature",
       description: "What this feature does and why it matters.",
       side: "bottom",
       align: "start",
     },
   };
   ```

3. **Insert the step** into the relevant `getTradingSteps` or `getOnboardingSteps` return array at the position that makes logical sense in the flow.

4. **Bump the localStorage key** if the tour was already shown to users (`trading-tour-v1` → `trading-tour-v2`).

---

## How to Reset the Tour (Testing)

Open DevTools console on any `/trading/*` page:

```js
// Force-reset — next page load will auto-start the tour
localStorage.removeItem("trading-tour-v1")

// Simulate Phase A (no wallet)
// → Disconnect your Polkadot extension, then refresh

// Simulate Phase B (wallet connected, no trading account)
// → Connect extension, ensure no proxy accounts exist, then refresh

// Simulate Phase C (proxy accounts exist, none in browser)
// → Connect extension, register a proxy, clear browser storage, then refresh

// Simulate fully connected (trading tour)
// → Connect extension + trading account, then removeItem and refresh
```

---

## Key Dependencies

| Package | Version | Purpose |
|---|---|---|
| `driver.js` | `^1.6.0` | Tour overlay and popover engine |
| `@orderbook/core` (internal) | `*` | `useConnectWalletProvider` — wallet state |
| `react` | `^18` | Hooks (`useRef`, `useCallback`, `useEffect`) |

The tour system has **no runtime dependency** on any UI component library — it operates entirely through Driver.js's own DOM manipulation and the CSS overrides in `tour.css`.
