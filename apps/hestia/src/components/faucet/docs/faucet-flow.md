# Faucet Feature — Complete Flow Reference

The faucet is a testnet token dispenser that lets users request free tokens on either the **Polkadex Testnet** (Substrate chain) or **Sepolia Testnet** (EVM chain). It requires no wallet connection — any valid address can receive tokens.

---

## Table of Contents

1. [Files at a Glance](#1-files-at-a-glance)
2. [Feature Gating & Routing](#2-feature-gating--routing)
3. [Component Tree](#3-component-tree)
4. [User Flow (Step-by-Step)](#4-user-flow-step-by-step)
5. [State Management](#5-state-management)
6. [Form Validation Rules](#6-form-validation-rules)
7. [Backend API](#7-backend-api)
8. [Network & Token Configuration](#8-network--token-configuration)
9. [Auto-fill Behavior](#9-auto-fill-behavior)
10. [Success & Error Handling](#10-success--error-handling)
11. [Responsive Layout](#11-responsive-layout)
12. [Environment Variables](#12-environment-variables)

---

## 1. Files at a Glance

```
apps/hestia/src/
├── app/faucet/
│   └── page.tsx                       # Next.js route — dynamically imports Template
├── middleware.ts                       # Route guard: redirects /faucet when disabled
└── components/faucet/
    ├── api.ts                          # All fetch calls to the faucet backend
    ├── template.tsx                    # Page layout (header, main area, footer, mobile profile)
    ├── Help.tsx                        # Static help cards (docs link + Discord link)
    └── Form/
        ├── index.tsx                   # Form logic: Formik, submission, auto-fill
        ├── selectNetwork.tsx           # Network dropdown + FaucetNetwork type
        └── selectToken.tsx             # Token dropdown + FaucetToken type
```

---

## 2. Feature Gating & Routing

### Environment flag

The faucet is **disabled by default**. It is enabled by setting:

```env
NEXT_PUBLIC_ENABLE_FAUCET=true
```

### Middleware guard (`middleware.ts`)

```ts
const isFaucetEnabled = process.env.NEXT_PUBLIC_ENABLE_FAUCET === "true";

if (!isFaucetEnabled && req.nextUrl.pathname.startsWith("/faucet")) {
  return NextResponse.redirect(new URL("/", req.url));
}
```

The matcher covers `/faucet` and `/faucet/:path*`. When the flag is absent or `"false"`, any direct navigation to `/faucet` is silently redirected to `/`.

### Navigation links

The "Faucet" link in the top navigation is also gated by this flag:
- Desktop nav: `components/ui/Header/index.tsx`
- Mobile nav: `components/ui/Header/responsiveMenuModal.tsx`

Both derive an `isFaucetDisabled` boolean from the same env var and render the link with a disabled state when false.

### Page entry (`app/faucet/page.tsx`)

```ts
const Template = dynamic(
  () => import("@/components/faucet/template").then((mod) => mod.Template),
  { ssr: false }
);
```

All faucet UI is client-side only (no SSR). This follows the same pattern as every other route in the app.

---

## 3. Component Tree

```
Template                            (template.tsx)
├── Header                          (ui/Header)
├── main
│   ├── page header ("Faucet" + drop icon)
│   ├── Form                        (Form/index.tsx)
│   │   ├── SelectNetwork           (Form/selectNetwork.tsx)
│   │   ├── SelectToken             (Form/selectToken.tsx)
│   │   │   └── SelectToken.Card    (Form/selectToken.tsx — per-token list item)
│   │   └── Input.Vertical          (@polkadex/ux — wallet address field)
│   └── Help                        (Help.tsx)
│       ├── HelpCard "How to use the Faucet" → https://docs.polkadex.ee
│       └── HelpCard "Having Trouble?" → https://discord.gg/G4KMw2sGGe
├── Footer                          (desktop only, ui/Footer)
└── ResponsiveProfile               (mobile only, when wallet is connected)
```

### Component responsibilities

| Component | Responsibility |
|-----------|---------------|
| `Template` | Page shell. Measures footer and mobile interaction bar heights to compute the correct `paddingBottom` so content is never hidden behind fixed elements. |
| `Form` | All interactive state: Formik form, network/token selection, address input, submit handler. |
| `SelectNetwork` | Controlled dropdown (Radix `Dropdown`). Renders `FAUCET_NETWORKS`. Measures its own trigger width via `useMeasure` to keep the dropdown content at least as wide as the trigger. |
| `SelectToken` | Same pattern as `SelectNetwork`. Disabled (opacity-40, pointer-events-none) until a network is selected. Uses compound component pattern: `SelectToken.Card` renders individual token rows. |
| `Help` | Pure presentational. Two `HelpCard` components that open external links in a new tab. |

---

## 4. User Flow (Step-by-Step)

```
1. User navigates to /faucet
        ↓
   Middleware checks NEXT_PUBLIC_ENABLE_FAUCET
        ↓ (enabled)
   Template renders (client-side, no SSR)

2. User opens the Network dropdown → selects a network
        ↓
   handleNetworkSelect() runs:
   - Sets selectedNetwork state
   - Clears selectedToken state
   - Sets Formik fields: networkId = network.id, tokenId = "", walletAddress = ""
   - Exception: if Polkadex is selected AND the user has a connected wallet,
     walletAddress is auto-filled with selectedAddresses.mainAddress

3. Token dropdown becomes active
   User opens it → selects a token
        ↓
   handleTokenSelect() runs:
   - Sets selectedToken state
   - Sets Formik field: tokenId = token.id

4. Wallet address field appears (conditional on selectedNetwork !== undefined)
   User types or edits the address
        ↓
   Formik validates on change/blur

5. "Request Tokens" button becomes active when:
   - networkId is set
   - tokenId is set
   - walletAddress passes format validation
   - form is not submitting

6. User clicks "Request Tokens"
        ↓
   Formik calls onSubmit():

   ┌─ Polkadex path ────────────────────────────────────────────┐
   │  POST /api/register   { address }                          │
   │       ↓ (201 Created or 200 Already registered)            │
   │  POST /api/drip       { address, asset: ticker }           │
   │       ↓                                                     │
   │  DripResult.amount → success toast                         │
   └────────────────────────────────────────────────────────────┘

   ┌─ Sepolia path ──────────────────────────────────────────────┐
   │  POST /api/drip/sepolia  { address, token: ticker }        │
   │       ↓                                                     │
   │  DripSepoliaResult.amount + .token → success toast         │
   └────────────────────────────────────────────────────────────┘

7. On success:
   - Success toast shown: "Tokens Sent! {amount} has been sent to your wallet"
   - Formik resets (all fields back to "")
   - selectedNetwork → undefined
   - selectedToken → undefined
   - UI returns to initial empty state

   On error:
   - Error message extracted from API JSON response body (field: "error")
   - Falls back to "Request failed (status)" if body is not JSON
   - Error toast shown: "Request Failed — {message}"
```

---

## 5. State Management

The faucet uses **no global or server state** — everything lives in the `Form` component.

### Formik (form state)

```ts
const initialValues = {
  walletAddress: "",
  tokenId: "",
  networkId: "",
};
```

Formik manages:
- Field values and `dirty` tracking
- Validation errors
- `isSubmitting` flag during async requests
- `resetForm()` on successful submission

### Local React state (selection state)

```ts
const [selectedNetwork, setSelectedNetwork] = useState<FaucetNetwork | undefined>();
const [selectedToken, setSelectedToken] = useState<FaucetToken | undefined>();
```

These are kept as separate state objects (not just the string IDs stored in Formik) because the UI components need the full objects — name, chainIcon, ticker — for rendering.

### Context (read-only)

| Hook | Context | Used for |
|------|---------|---------|
| `useProfile()` | `ProfileProvider` | `selectedAddresses.mainAddress` — auto-fill for Polkadex |
| `useSettingsProvider()` | `SettingProvider` | `onHandleAlert()`, `onHandleError()` — toast notifications |
| `useConnectWalletProvider()` | `ConnectWalletProvider` | `browserAccountPresent`, `extensionAccountPresent` — mobile profile bar visibility |

The faucet does **not** write to any context or trigger any blockchain transactions — it is purely a REST API consumer.

---

## 6. Form Validation Rules

Validation runs on every change (Formik `validate` function, not schema-based):

| Field | Rule | Error message |
|-------|------|---------------|
| `networkId` | Required (non-empty string) | "Please select a network" |
| `tokenId` | Required (non-empty string) | "Please select a token" |
| `walletAddress` | Required | "Wallet address is required" |
| `walletAddress` (Sepolia) | Must match `/^0x[a-fA-F0-9]{40}$/` | "Enter a valid Ethereum address (0x...)" |
| `walletAddress` (Polkadex) | `trim().length >= 30` | "Enter a valid wallet address" |

The address validation is **network-aware**: the active rule depends on `selectedNetwork?.id`. When the user switches networks, the address field resets to `""` so the old address cannot accidentally pass the wrong chain's validation.

Validation errors for `walletAddress` are shown inside a Radix `Tooltip` that opens when the field is both `touched` and `invalid`. The token error is shown as a small inline `Typography.Text` below the token selector.

The submit button state:
```ts
const disabled = !isValid || !dirty || isSubmitting;
```

---

## 7. Backend API

All calls are in `components/faucet/api.ts`. The base URL and API key come from env vars at module load time.

```ts
const BASE_URL = process.env.NEXT_PUBLIC_FAUCET_URL ?? "";
const API_KEY  = process.env.NEXT_PUBLIC_FAUCET_API_KEY ?? "";

const requestHeaders = () => ({
  "Content-Type": "application/json",
  "X-API-Key": API_KEY,
});
```

### `POST /api/register`

Registers a Substrate address with the faucet service before dripping. Called only on the Polkadex path, always before `/api/drip`.

**Request:**
```json
{ "address": "5GrwvaEF5zXb26Fz..." }
```

**Response (`RegisterResult`):**
```ts
{
  success: boolean;
  created: boolean;      // true = first registration; false = already registered
  address: string;
  registeredAt: string;  // ISO timestamp
}
```

**Notes:** The frontend does not distinguish between `created: true` and `created: false` — either way it proceeds to `/api/drip`. If this call fails (non-2xx), the drip is aborted and an error toast is shown.

---

### `POST /api/drip`

Drips tokens to a registered Substrate address on the Polkadex Testnet.

**Request:**
```json
{ "address": "5GrwvaEF5zXb26Fz...", "asset": "WETH" }
```

The `asset` value is the token's `ticker` from `POLKADEX_TOKENS` (e.g. `"PDEX"`, `"WETH"`, `"USDC"`).

**Response (`DripResult`):**
```ts
{
  success: boolean;
  asset: string;          // echoes back the requested asset
  txHash: string;         // on-chain transaction hash
  blockHash: string;      // block in which the tx was included
  amount: string;         // human-readable amount, e.g. "10 PDEX"
  usedToday: number;      // requests made today from this address
  remainingToday: number; // requests remaining today
  dailyLimit: number;     // total daily limit per address
}
```

The `amount` field from this response is used verbatim in the success toast.

---

### `POST /api/drip/sepolia`

Drips ERC-20 tokens to an Ethereum address on Sepolia.

**Request:**
```json
{ "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "token": "USDC" }
```

The `token` value is the ticker from `SEPOLIA_TOKENS`.

**Response (`DripSepoliaResult`):**
```ts
{
  success: boolean;
  token: string;        // echoes back the requested token ticker
  amount: string;       // human-readable amount, e.g. "100"
  address: string;      // echoes back the recipient address
  txHash: string;       // Sepolia transaction hash
  explorerUrl: string;  // full Sepolia Etherscan URL for the tx
}
```

The success message is built as `"${result.amount} ${result.token} has been sent to your wallet"`. The `explorerUrl` is returned by the API but not currently shown in the UI.

---

### Error handling

All three functions use the same error extraction pattern:

```ts
async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return body.error ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}
```

Any non-2xx response throws an `Error` with this message. The `Form` `onSubmit` catches it and passes `error.message` to `onHandleError()`.

---

## 8. Network & Token Configuration

Both lists are **hardcoded** in `Form/index.tsx`. There is no dynamic fetching.

### Available networks (`selectNetwork.tsx`)

```ts
export const FAUCET_NETWORKS: FaucetNetwork[] = [
  { id: "polkadex", name: "Polkadex Testnet", chainIcon: "Polkadex" },
  { id: "sepolia",  name: "Sepolia Testnet",  chainIcon: "Ethereum" },
];
```

`chainIcon` maps to the `Chain` component from `@polkadex/ux`.

### Available tokens (`Form/index.tsx`)

**Polkadex Testnet (9 tokens):**

| id | ticker | name |
|----|--------|------|
| `pdex` | PDEX | Polkadex |
| `weth` | WETH | Wrapped Ethereum |
| `usdc` | USDC | USD Coin |
| `usdt` | USDT | Tether USD |
| `wbtc` | WBTC | Wrapped Bitcoin |
| `link` | LINK | ChainLink Token |
| `uni` | UNI | Uniswap |
| `aave` | AAVE | Aave Token |
| `wsteth` | WSTETH | Wrapped Liquid Staked ETH 2.0 |

**Sepolia Testnet (7 tokens — no PDEX or WETH):**

| id | ticker | name |
|----|--------|------|
| `usdc` | USDC | USD Coin |
| `usdt` | USDT | Tether USD |
| `wbtc` | WBTC | Wrapped Bitcoin |
| `link` | LINK | ChainLink Token |
| `uni` | UNI | Uniswap |
| `aave` | AAVE | Aave Token |
| `wsteth` | WSTETH | Wrapped Liquid Staked ETH 2.0 |

The active list is derived via `useMemo` on the selected network:

```ts
const availableTokens = useMemo(
  () => selectedNetwork?.id === "sepolia" ? SEPOLIA_TOKENS : POLKADEX_TOKENS,
  [selectedNetwork?.id],
);
```

> **Note:** These lists are hardcoded and must be kept in sync with what the backend faucet service actually supports. Adding a new token or network requires a code change here. This has the same scalability limitation as the bridge token config — see the bridge migration plan as a reference for how a future API-driven approach could work.

The `id` field of each token is also used as the `TokenAppearance` key for the token icon in `@polkadex/ux`:

```tsx
<Token name={token.ticker} appearance={token.id as TokenAppearance} ... />
```

If the `id` doesn't match a valid `TokenAppearance` key, the icon will fall back to a generic placeholder.

---

## 9. Auto-fill Behavior

When the user selects **Polkadex Testnet** and has a Polkadot wallet connected, the wallet address field is automatically populated with the user's main Substrate address.

This happens in two places to cover all cases:

**On network selection** (`handleNetworkSelect`):
```ts
const autoAddress =
  network.id === "polkadex" && selectedAddresses.mainAddress
    ? selectedAddresses.mainAddress
    : "";
setFieldValue("walletAddress", autoAddress);
```

**On mount / address change** (`useEffect`):
```ts
useEffect(() => {
  if (selectedNetwork?.id === "polkadex" && selectedAddresses.mainAddress) {
    setFieldValue("walletAddress", selectedAddresses.mainAddress);
  }
}, [selectedNetwork?.id, selectedAddresses.mainAddress, setFieldValue]);
```

The `useEffect` covers the case where the user already has Polkadex selected but connects their wallet afterward (the address becomes available after the effect fires).

`selectedAddresses.mainAddress` comes from `useProfile()` → `ProfileProvider` → Polkadot.js extension or local browser account. It is a Substrate SS58 address (begins with `5`).

For **Sepolia**, no auto-fill occurs — the user must manually enter their Ethereum address.

---

## 10. Success & Error Handling

Both notification functions come from `useSettingsProvider()` and use the `sonner` toast library internally.

**Success:**
```ts
// Polkadex
onHandleAlert("Tokens Sent!", `${result.amount} has been sent to your wallet`);

// Sepolia
onHandleAlert("Tokens Sent!", `${result.amount} ${result.token} has been sent to your wallet`);
```

**Error:**
```ts
onHandleError(
  "Request Failed",
  error instanceof Error ? error.message : "Something went wrong. Please try again.",
);
```

The `error.message` is the string extracted from the backend's JSON `error` field (see `extractErrorMessage`). Common causes include rate limiting (daily limit exceeded) or invalid address format rejected server-side.

After a **successful** submission, the entire form resets to its initial state — all Formik fields cleared, `selectedNetwork` and `selectedToken` both set to `undefined`. The user must start the selection flow from scratch for the next request.

---

## 11. Responsive Layout

`Template` handles two different fixed-element cases:

| Viewport | Fixed element | Measurement |
|----------|--------------|-------------|
| `width > 640px` (desktop) | `Footer` (fixed at bottom) | `footerBounds.height` via `useMeasure` |
| `width <= 640px` (mobile) | `ResponsiveProfile` bar (fixed at bottom, only when wallet connected) | `interactionBounds.height` via `useMeasure` |

The `paddingBottom` of `<main>` is set dynamically to whichever fixed element is present, preventing content from being hidden behind it.

`ResponsiveProfile` is only shown on mobile when `browserAccountPresent || extensionAccountPresent`. If no wallet is connected on mobile, no interaction bar appears and `paddingBottom` is `0`.

---

## 12. Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_ENABLE_FAUCET` | Yes | `"true"` enables the route and nav link. Any other value (or unset) disables faucet entirely. |
| `NEXT_PUBLIC_FAUCET_URL` | Yes | Base URL of the faucet backend service (e.g. `https://faucet.polkadex.ee`). Defaults to `""` (all requests fail silently). |
| `NEXT_PUBLIC_FAUCET_API_KEY` | Yes | Value sent as `X-API-Key` header on every request. Defaults to `""`. |

All three must be set for the faucet to function. If `NEXT_PUBLIC_FAUCET_URL` or `NEXT_PUBLIC_FAUCET_API_KEY` are missing, requests will go to `""` or fail authentication — the form will submit but every request will error.

Declare them in `apps/hestia/next.config.js` under `env:` if they are not already listed, and populate them in `.env.local` (local dev) or your deployment environment secrets.
