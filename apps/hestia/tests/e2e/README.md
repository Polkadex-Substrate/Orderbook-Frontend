# Polkadex Orderbook — E2E Testing Guide

All commands are run from `apps/hestia/` unless stated otherwise.

---

## Overview

The Orderbook frontend (`apps/hestia`) uses [Playwright](https://playwright.dev/) for end-to-end testing. Playwright drives a real Chromium browser against the running Next.js dev server and asserts on what the UI actually renders — not on mocked data or isolated components.

**Why Playwright for a DEX UI:**
The app is heavily client-side (all providers load via `dynamic({ ssr: false })`), connects to a live Polkadex chain over WebSocket, and requires wallet extensions (Polkadot.js, MetaMask) for on-chain actions. Playwright is the only practical tool that can drive this full stack — it controls the browser, can interact with extension popups in headed mode, and can save and restore browser localStorage (including the trading account keyring) via `storageState`.

**Integration points in the codebase:**

| What | Where |
|---|---|
| Playwright config | `apps/hestia/playwright.config.ts` |
| Scripts | `apps/hestia/package.json` — `test:e2e`, `test:e2e:flags`, `test:e2e:tier2:setup`, `test:e2e:tier2` |
| All test files | `apps/hestia/tests/e2e/` |
| Shared helpers | `apps/hestia/tests/e2e/helpers.ts` — `suppressTestnetModal`, `visibleTooltip` |
| Tier 2 helpers | `apps/hestia/tests/e2e/tier2/helpers.ts` — `signCue`, `anyToast`, `confirmTransactionModal` |
| Saved wallet state | `apps/hestia/tests/e2e/tier2/.auth/funded-state.json` (gitignored) |

**The dev server** is started automatically by Playwright's `webServer` block in `playwright.config.ts` (`yarn dev` on port 3000). If the server is already running when you invoke `yarn test:e2e`, Playwright reuses it (`reuseExistingServer: true`) and skips the startup wait. The env-flag tests bring up a second server on port 3001 with overridden `NEXT_PUBLIC_*` vars to test the maintenance-mode and faucet-disabled paths without touching your primary server.

**Two-tier design:** Tests are split by whether they need a wallet:

- **Tier 1** (`validation/`) — fully headless, no wallet, CI-safe. Covers form validation, disabled-button states, and env-var gating using `suppressTestnetModal` to neutralise the Radix focus-trap modal that would otherwise block keyboard events.
- **Tier 2** (`tier2/`) — headed, semi-automated. Playwright drives everything around the signing step; the human approves extension popups when the `👉 ACTION REQUIRED` cue appears in the terminal. Place-Order tests (PO-01..PO-12) are an exception — they use a browser-wallet trading account stored in `localStorage["gDrive"]`, so signing is in-process with no popup at all.

---

## Quick Reference

| Command | What it runs | Headed | Human needed |
|---|---|---|---|
| `yarn test:e2e` | Tier 1 — headless validation (10 tests) | No | No |
| `yarn test:e2e:flags` | FA-10 + HFT-20 — maintenance-mode env tests | No | No |
| `yarn test:e2e:tier2:setup` | One-time funded-state creation | **Yes** | **Yes** |
| `yarn test:e2e:tier2` | Tier 2 — semi-automated wallet tests | **Yes** | Partly |

---

## 1. What Is Already in the Code

### File Structure

```
apps/hestia/tests/e2e/
├── helpers.ts                         Shared utilities: suppressTestnetModal, visibleTooltip
├── smoke.spec.ts                      AC-00 — page title check (CI baseline)
│
├── validation/                        TIER 1 — headless, no wallet, CI-safe
│   ├── bridge.spec.ts                 HFT-13 HFT-14 HFT-15 HFT-21
│   ├── env-flags.spec.ts              FA-10 HFT-20  (second server, see §6.2)
│   ├── faucet.spec.ts                 FA-06 FA-07 FA-08 FA-09
│   ├── faucet-api.spec.ts             FA-01 FA-02 FA-03 FA-04 FA-05 (REST, env-gated)
│   ├── trading.spec.ts                AC-04
│   └── transfer.spec.ts               IT-06 (skipped — Tier 2)
│
└── tier2/                             TIER 2 — headed, semi-automated
    ├── helpers.ts                     signCue, SIGN_TIMEOUT, anyToast, successToast, etc.
    ├── setup.spec.ts                  One-time: creates .auth/funded-state.json
    ├── account.spec.ts                AC-02 AC-05 AC-06
    ├── internal-transfer.spec.ts      IT-01 IT-02 IT-03 IT-06 IT-07 IT-08 IT-09
    ├── bridge.spec.ts                 HFT-01 HFT-02 HFT-03 HFT-07 HFT-08 HFT-16 HFT-18 HFT-19
    ├── trading.spec.ts                PO-01 → PO-12  (fully automated via storageState)
    ├── explorer.spec.ts               EX-01 → EX-09
    └── .auth/
        ├── .gitignore                 funded-state.json is never committed
        └── funded-state.json          Created by setup.spec.ts — contains wallet keyring
```

### Playwright Projects

| Project | headless | workers | storageState | Matches |
|---|---|---|---|---|
| `chromium` | yes | 2 | none | `validation/**`, `smoke.spec.ts` |
| `chromium-env-flags` | yes | 2 | none | `validation/env-flags.spec.ts` only |
| `tier2-setup` | **no** | 1 | none | `tier2/setup.spec.ts` only |
| `tier2` | **no** | 1 | per-describe (PO/EX apply it; IT/AC don't) | `tier2/*.spec.ts` (except setup) |

### Key Design Decisions

**Browser-wallet trading account (critical for PO tests)**
`useCreateOrder.ts` checks `isSignedByExtension = (tradeAddress === mainAddress)`.
If you create the trading account as a *browser wallet* (separate keyring, different address),
orders are signed in-process from `localStorage["gDrive"]` — **no extension popup per order**.
The funded storageState captures this keyring, so PO-01..PO-12 run fully automated.

**Radix Tooltip portals render twice**
Every error tooltip is asserted via `visibleTooltip(page, text)` from `helpers.ts`,
which scopes to `[data-radix-popper-content-wrapper]` and uses `.last()`.
Raw `getByText()` fails with a strict-mode violation because Radix renders a
VisuallyHidden a11y copy alongside the visible element.

**TestnetModal focus-trap**
`suppressTestnetModal(page)` must be called before every `page.goto()` in any test
that interacts with form inputs. The modal is a Radix `alertdialog` that traps keyboard
focus, preventing Tab/blur events from firing until dismissed.
It writes `sessionStorage["testnet-notice-acknowledged"] = "1"` via `addInitScript`
before the page loads, so the modal never opens.

---

## 2. Machine Setup

### 2.1 All Platforms

```bash
# Node.js ≥ 20 required. Confirm with:
node --version

# Install dependencies from repo root
yarn install

# Install Playwright browsers (from apps/hestia/)
cd apps/hestia
node_modules/.bin/playwright install chromium
```

---

### 2.2 Windows / WSL2 (Ubuntu 26.04)

**Problem:** Ubuntu 26.04 does not ship `libasound.so.2` by default, and the standard
`apt-get` requires root. Playwright's Chromium binary links against it.

**Solution (run once):**

```bash
# 1. Install zstandard (needed to unpack the .deb)
pip install zstandard --break-system-packages

# 2. Download the ALSA library package
mkdir -p /tmp/libasound_extract
curl -sL "http://archive.ubuntu.com/ubuntu/pool/main/a/alsa-lib/libasound2t64_1.2.15.3-1ubuntu1_amd64.deb" \
  -o /tmp/libasound_extract/libasound2t64.deb

# 3. Extract the .so file
python3 -c "
import zstandard, tarfile, io, os
os.makedirs('/tmp/libasound_extract', exist_ok=True)
with open('/tmp/libasound_extract/data.tar.zst', 'rb') as f:
    # First extract data.tar.zst from the .deb (ar archive)
    pass
"
# Simpler: use ar and python together
cd /tmp/libasound_extract && ar x libasound2t64.deb
python3 -c "
import zstandard, tarfile, io, os
os.makedirs('/tmp/libasound_libs', exist_ok=True)
with open('/tmp/libasound_extract/data.tar.zst', 'rb') as f:
    data = zstandard.ZstdDecompressor().decompress(f.read(), max_output_size=50*1024*1024)
with tarfile.open(fileobj=io.BytesIO(data)) as tar:
    for m in tar.getmembers():
        if 'libasound' in m.name and '.so' in m.name:
            tar.extract(m, '/tmp/libasound_libs/', set_attrs=False)
"

# 4. Install to user lib dir
mkdir -p ~/.local/lib
cp /tmp/libasound_libs/usr/lib/x86_64-linux-gnu/libasound.so.2.0.0 ~/.local/lib/
ln -sf ~/.local/lib/libasound.so.2.0.0 ~/.local/lib/libasound.so.2
```

**Add to your `~/.bashrc` or `~/.zshrc` (permanent fix):**

```bash
export PLAYWRIGHT_LD_LIBRARY_PATH=$HOME/.local/lib
```

Reload: `source ~/.bashrc`

The `playwright.config.ts` reads this env var and prepends it to `LD_LIBRARY_PATH`
before launching Chromium. Without it, every Playwright command fails with:
`error while loading shared libraries: libasound.so.2`.

**Using system-installed `libasound`** (if you have sudo):

```bash
sudo apt-get install -y libasound2t64
# No env var needed after this.
```

---

### 2.3 macOS

No special setup required. Playwright's bundled Chromium works out of the box.

```bash
# Install Playwright browsers from apps/hestia/
node_modules/.bin/playwright install chromium
```

If running Tier 2 tests that need browser extensions (Polkadot.js, MetaMask),
add `channel: 'chrome'` to the tier2 project in `playwright.config.ts` (see §2.5).

---

### 2.4 Linux (native, with sudo)

```bash
# Ubuntu/Debian
sudo apt-get install -y libasound2t64

# Or let Playwright install all dependencies:
node_modules/.bin/playwright install-deps chromium
```

---

### 2.5 Browser Extensions for Tier 2 Tests

Playwright's default Chromium is a bare browser with no extensions. For Tier 2 tests
where the human signs extension popups (IT-01, AC-05, HFT-08, etc.) you need a browser
that has Polkadot.js and MetaMask installed.

**Option A — Use system Chrome (recommended)**

Add `channel: 'chrome'` to both tier2 projects in `playwright.config.ts`:

```typescript
// In playwright.config.ts — tier2-setup and tier2 projects:
{
  name: "tier2-setup",
  use: {
    ...devices["Desktop Chrome"],
    channel: "chrome",   // ← add this
    headless: false,
  },
  // ...
},
{
  name: "tier2",
  use: {
    ...devices["Desktop Chrome"],
    channel: "chrome",   // ← add this
    headless: false,
    actionTimeout: 30_000,
  },
  // ...
},
```

Then install Chrome on your machine and add the extensions to your Chrome profile:
- [Polkadot.js extension](https://polkadot.js.org/extension/) (or Talisman / SubWallet)
- [MetaMask](https://metamask.io/) — required for HFT-01, HFT-02, HFT-03 (bridge inbound)

**Option B — PO tests only (no extension needed)**

If you only want to run PO-01..PO-12, you don't need any extension at all.
The storageState approach provides all identity/keyring data from localStorage.
Just run the setup step manually (fill the state file by hand or copy from a
machine that completed it) and `yarn test:e2e:tier2 --grep "Journey 4"`.

**On WSL2:** `channel: 'chrome'` requires Chrome for Linux to be installed in the WSL
filesystem (not Windows Chrome). Install it with:

```bash
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo dpkg -i google-chrome-stable_current_amd64.deb
sudo apt-get install -f
```

---

## 3. Environment Variables

### 3.1 Required for all test runs

```bash
# apps/hestia/.env.local

# Enable the faucet route (needed for FA tests and Tier 2 setup)
NEXT_PUBLIC_ENABLE_FAUCET=true

# Blockchain RPC endpoint
POLKADEX_CHAIN=wss://your-testnet-rpc-endpoint

# GraphQL / backend URL
GRAPHQL_URL=https://your-graphql-url
```

### 3.2 Required for faucet API tests (FA-01..FA-05)

```bash
# Faucet REST API
NEXT_PUBLIC_FAUCET_URL=https://your-faucet-url
NEXT_PUBLIC_FAUCET_API_KEY=your-api-key  # leave empty string if not required

# A real testnet substrate address to receive dripped tokens (≥ 30 chars)
# Set this as a shell env var, NOT in .env.local (it's not a NEXT_PUBLIC_ var)
export TEST_SUBSTRATE_ADDRESS=5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY
```

Without `NEXT_PUBLIC_FAUCET_URL`, the entire faucet-api.spec.ts suite is skipped
with the message `"Set NEXT_PUBLIC_FAUCET_URL and TEST_SUBSTRATE_ADDRESS to run faucet API tests"`.

### 3.3 Required for bridge tests (HFT)

```bash
# WrappedHyperFungibleToken.sol contract address on Sepolia
NEXT_PUBLIC_BRIDGE_WETH_HFT_ADDRESS=0xYourContractAddress

# Sepolia RPC for EVM calls
NEXT_PUBLIC_BRIDGE_SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your-key

# HyperBridge ISMP host contract on Sepolia
NEXT_PUBLIC_BRIDGE_ISMP_HOST=0xIsmpHostAddress
```

### 3.4 Required for env-flag tests (FA-10, HFT-20)

These tests start a second dev server on port 3001. No extra env vars needed —
the config overrides `NEXT_PUBLIC_ENABLE_FAUCET=false` and
`NEXT_PUBLIC_IS_HYPERBRIDGE_MAINTENANCE=true` at server startup.

Run with `yarn test:e2e:flags`.

### 3.5 Required for explorer tests (EX-01..EX-09, SubQuery-gated)

```bash
# SubQuery indexer for transfer history
NEXT_PUBLIC_SUBQUERY_URL=https://your-subquery-endpoint
```

Without this, EX-01..EX-05, EX-08, EX-09 are individually skipped inside the test.
EX-06, EX-07 run regardless.

### 3.6 Optional tuning (Tier 2 trading tests)

```bash
# Minimum quantity for PDEXPWETH market (from backend market config)
# Used in PO-11 and PO-12.  Default fallback: "0.0001"
export TEST_MIN_QUANTITY=0.0001
export TEST_BELOW_MIN_QUANTITY=0.00001

# A fresh substrate address with zero transfer history — for EX-06
export TEST_FRESH_SUBSTRATE_ADDRESS=5YourFreshAddress...
```

---

## 4. First-Time Setup Sequence

Follow this order exactly the first time on any machine or testnet environment.

### Step 1 — Machine dependencies

Complete section §2 for your platform. Confirm Playwright's Chromium launches:

```bash
cd apps/hestia
PLAYWRIGHT_LD_LIBRARY_PATH=$HOME/.local/lib \
  node_modules/.bin/playwright test --project=chromium tests/e2e/smoke.spec.ts
# Expected: 1 passed
```

### Step 2 — Set env vars

Copy `.env.migration.example` to `.env.local` and fill in the values from §3.
At minimum for all tier 1 tests: `NEXT_PUBLIC_ENABLE_FAUCET=true` and a working
`POLKADEX_CHAIN` RPC endpoint.

### Step 3 — Install browser extensions

If running any Tier 2 tests that pop extension windows (AC-05, IT-01..IT-03, HFT-08):

1. Add `channel: 'chrome'` to both tier2 projects in `playwright.config.ts` (§2.5)
2. Open Chrome and install Polkadot.js / Talisman and MetaMask
3. Import your testnet funding account into the extension
4. Fund the account with PDEX using the faucet at `/faucet`

### Step 4 — Run Tier 1 to confirm baseline

```bash
yarn test:e2e
# Expected: 10 passed (smoke + FA-06..FA-09 + HFT-13..HFT-21 + AC-04)
```

### Step 5 — Create the funded storageState (required before any Tier 2 run)

```bash
yarn test:e2e:tier2:setup
```

A Chrome window opens. Follow the three-step guide printed in the terminal:

| Step | What to do | Signal the script waits for |
|---|---|---|
| 1 — Connect wallet | Click "Connect wallet" → approve dapp connection in extension | `PROFILE/ACTIVE_ACCOUNT.mainAddress` appears in localStorage |
| 2 — Create trading account | **Choose Browser Wallet type** (NOT Extension Proxy) → sign extrinsic | `PROFILE/ACTIVE_ACCOUNT.tradeAddress ≠ mainAddress` in localStorage |
| 3 — Deposit balance | Navigate to `/transfer`, deposit ≥10 PDEX + ≥0.01 WETH → navigate to `/balances` | URL matches `/balances` |

The script saves `tests/e2e/tier2/.auth/funded-state.json` automatically.
This file is gitignored — it contains wallet address data and the trading keypair.

**Re-run setup only when:**
- You switch to a different testnet account
- The trading account is removed or expired on-chain
- The trading account balance is fully depleted

---

## 5. Running Tests

### 5.1 Tier 1 — Headless validation (CI-safe)

```bash
yarn test:e2e
```

Runs headless, 2 parallel workers, no wallet, no env setup beyond `.env.local`.
All 10 tests should pass on any machine with Chromium installed.

**Run a single case:**
```bash
yarn test:e2e --grep "FA-06"
```

### 5.2 Faucet API tests (FA-01..FA-05)

```bash
TEST_SUBSTRATE_ADDRESS=5Gxxx... yarn test:e2e
```

FA-01..FA-05 live in `validation/faucet-api.spec.ts` alongside the other validation
tests. They skip automatically if `NEXT_PUBLIC_FAUCET_URL` is unset.

### 5.3 Env-flag tests (FA-10, HFT-20)

```bash
yarn test:e2e:flags
```

Starts a second dev server on port 3001 with
`NEXT_PUBLIC_ENABLE_FAUCET=false` and `NEXT_PUBLIC_IS_HYPERBRIDGE_MAINTENANCE=true`.
Takes longer to start (~2 min) because it boots a second Next.js process.

### 5.4 Tier 2 — Semi-automated (headed, human signs)

```bash
yarn test:e2e:tier2
```

Opens a headed Chrome window and runs all `tier2/*.spec.ts` files serially at 1 worker.

**During the run:** watch the terminal. When a human action is required, you will see:

```
────────────────────────────────────────────────────────────────
  👉  ACTION REQUIRED  ›  Polkadot.js / Talisman / SubWallet
      Sign the ocex.deposit extrinsic — depositing 1 PDEX ...
      Timeout: 150s — test auto-proceeds on UI change
────────────────────────────────────────────────────────────────
```

Switch to the Chrome window, sign in the extension popup, and return to the terminal.
The test detects the UI change (toast, form reset, etc.) and proceeds automatically.
**Never press anything in the terminal** — there is no `page.pause()`.

**What requires human action vs what is automatic:**

| Test file | Human action required | What to do |
|---|---|---|
| `account.spec.ts` AC-02 | Approve dapp connection | Click "Connect wallet" → approve in extension |
| `account.spec.ts` AC-05 | Sign extrinsic | Sign `addProxyAccount` popup in extension |
| `account.spec.ts` AC-06 | None | Auto — reads /balances |
| `internal-transfer.spec.ts` IT-01..IT-03, IT-08, IT-09 | Sign extrinsic each time | Sign `ocex.deposit` / `ocex.withdraw` popup |
| `internal-transfer.spec.ts` IT-06, IT-07 | None | Auto — uses storageState |
| `bridge.spec.ts` HFT-01 | Approve MetaMask connection | Click connect → approve in MetaMask |
| `bridge.spec.ts` HFT-02 | Sign 2× MetaMask popups | Confirm ERC-20 approval, then send tx |
| `bridge.spec.ts` HFT-03 | Sign 1× MetaMask popup | Confirm send tx |
| `bridge.spec.ts` HFT-07 | None | Auto — button click |
| `bridge.spec.ts` HFT-08 | Sign extrinsic | Sign `hyperFungibleToken.send` in extension |
| `bridge.spec.ts` HFT-16, HFT-18, HFT-19 | None | Auto — validation from storageState |
| **`trading.spec.ts` PO-01..PO-12** | **None** | **Fully automated — browser-wallet keyring** |
| `explorer.spec.ts` all | None | Auto — read-only from storageState |

**Run a specific journey:**
```bash
# Only PO tests (fully automated, ~2 min)
yarn test:e2e:tier2 --grep "Journey 4"

# Only IT tests
yarn test:e2e:tier2 --grep "Journey 3"

# Single case
yarn test:e2e:tier2 --grep "IT-01"
```

---

## 6. TODOs — Pin After First Run

These are marked `// TODO:` in the code. None block test execution; they just make
assertions more precise. Pin them after your first successful run.

### 6.1 Transfer deposit/withdraw success text

**File:** `tests/e2e/tier2/internal-transfer.spec.ts`
**Location:** IT-01, IT-02, IT-03, IT-08, IT-09 — each uses `anyToast(page)`
**What to do:**
1. Run IT-01 headed
2. Watch the Chrome window after signing — note the exact toast title
3. Replace `anyToast(page)` with `page.getByText("Exact Title Here")`

The toast fires via `onHandleAlert(title, description)` in the form's submit handler.
Expected pattern: something like `"Deposit Successful"` or `"Transaction submitted"`.

### 6.2 IT-03 direction-toggle selector

**File:** `tests/e2e/tier2/internal-transfer.spec.ts` — IT-03
**What to do:**
The current code uses a fallback chain to find the swap-direction button. Run IT-03
headed, open Playwright Inspector (`--headed --debug`), and find the exact selector
for the arrow/swap icon between the From/To cards. Replace the fallback chain with a
single stable selector.

### 6.3 AC-05 — Create Trading Account button selector

**File:** `tests/e2e/tier2/account.spec.ts` — AC-05
**What to do:**
The test uses `page.getByRole('button', { name: /connect.*trading|create.*trading/i })`.
Run AC-05 headed, see which button opens the trading account creation flow, and pin
the exact text.

### 6.4 HFT-07 swap-direction button selector

**File:** `tests/e2e/tier2/bridge.spec.ts` — HFT-07 and HFT-08
**What to do:**
The swap button between source/destination chain rows uses a fallback SVG-filter
selector. Run HFT-07 headed and identify the exact element (likely a button with
an aria-label or a specific class).

### 6.5 PO-11 / PO-12 minimum quantity

**File:** `tests/e2e/tier2/trading.spec.ts` — PO-11, PO-12
**What to do:**
Set env vars from your testnet market config:

```bash
# In .env.local or your shell — these come from the PDEXPWETH market config
# on the backend (minQuantity field)
TEST_MIN_QUANTITY=0.0001          # exact minimum for PDEXPWETH
TEST_BELOW_MIN_QUANTITY=0.00001   # one unit below minimum
```

Or open the trading page, try placing a tiny order, and read the
`"Minimum amount: X"` tooltip — that X is the minimum.

### 6.6 Confirm /transfer/PDEX and /transfer/WETH routes

**File:** `tests/e2e/tier2/internal-transfer.spec.ts`
**What to do:**
Navigate to `/transfer/PDEX` and `/transfer/WETH` in the browser and confirm the
form loads with the correct asset selected. If the routes don't exist on your
testnet (asset IDs differ), update the route params in IT-01..IT-03.

### 6.7 EX-06 fresh address

**File:** `tests/e2e/tier2/explorer.spec.ts` — EX-06
**What to do:**
EX-06 verifies that an address with no transfers shows "No results found".
To run it properly:
1. Create a brand-new substrate address (or use one that has never received transfers)
2. Set `TEST_FRESH_SUBSTRATE_ADDRESS=5YourAddress...` in your shell
3. Modify the test to inject that address into localStorage before navigation, or
   connect the fresh account via the extension during the test run.

---

## 7. Skipped Tests — Why and What to Do

| Test ID | File | Skip reason | How to un-skip |
|---|---|---|---|
| AC-03 | account.spec.ts | Needs extension with zero accounts — contradicts funded account setup | Run in a separate browser profile with extension installed but no accounts added |
| AC-07 | account.spec.ts | Needs account with PDEX < proxy bond | Fund a fresh account with less than the minimum bond amount |
| AC-08 | account.spec.ts | Needs exact minimum PDEX balance | Fund a fresh account with exactly the minimum bond amount |
| IT-06 | validation/transfer.spec.ts | Tier 1 skip — Radix Tooltip doesn't mount without real chainBalance (no wallet) | Covered in `tier2/internal-transfer.spec.ts` with storageState |
| PO-09 | trading.spec.ts | Needs expired trading session | Clear `gDrive` from localStorage manually, reload, attempt order |
| HFT-17 | bridge.spec.ts | No free-text EVM recipient field found in the bridge form | Investigate bridge confirm dialog for a recipient override input |
| EX-06 (partial) | explorer.spec.ts | Inner test.skip fires when not connected | Connect a fresh account with no history |

---

## 8. Troubleshooting

### "error while loading shared libraries: libasound.so.2" (WSL2)

The `libasound.so.2` library is not installed. Follow §2.2 to extract it manually,
then confirm `export PLAYWRIGHT_LD_LIBRARY_PATH=$HOME/.local/lib` is in your shell.
Verify with:

```bash
ls ~/.local/lib/libasound.so.2
LD_LIBRARY_PATH=$HOME/.local/lib \
  node_modules/.bin/playwright test tests/e2e/smoke.spec.ts --project=chromium
```

### "Extension popup never appears" (Tier 2)

Playwright's default Chromium has no extensions. Add `channel: 'chrome'` to the
tier2 and tier2-setup projects in `playwright.config.ts`, then install the extensions
in your system Chrome (see §2.5).

### Test times out waiting for 👉 sign cue (150s exceeded)

The sign cue is printed in the terminal, not in the browser. Check the terminal window.
If you missed the window, re-run the individual test:

```bash
yarn test:e2e:tier2 --grep "IT-01"
```

### "funded-state.json: no such file" (PO/EX tests)

The one-time setup has not been run. Execute:

```bash
yarn test:e2e:tier2:setup
```

Follow all three steps. The file is created automatically at the end.

### "strict mode violation: resolved to N elements"

A `getByText` or `getByRole` matched multiple elements. Use `visibleTooltip(page, text)`
for error tooltips (resolves the Radix double-render issue). For buttons, scope the
locator: `page.getByRole('main').getByRole('button', { name: '...' })`.

### "The amount must be greater than 0" not appearing on bridge (HFT-15)

Check that `NEXT_PUBLIC_IS_HYPERBRIDGE_MAINTENANCE` is **not** `"true"` in your
`.env.local` — if it is, the form is replaced by the maintenance screen and the
amount input is never rendered.

### OOM / Chromium killed (exit code 137)

Reduce worker count. In `playwright.config.ts`, lower `workers` from `2` to `1`.
This is already forced to `1` for Tier 2 (`TIER2=1` env var), but if Tier 1 still
OOMs, add `workers: 1` unconditionally.

### "Too Small!" tooltip doesn't appear (IT-06 in tier2)

Ensure you are running IT-06 from the `tier2` project (uses storageState):

```bash
yarn test:e2e:tier2 --grep "IT-06"
```

The same test is skipped in `validation/transfer.spec.ts` because without a real
chain balance (no wallet), `chainBalance = NaN` and the Radix Tooltip refuses to
mount its portal content.

---

## 9. CI Integration

Tier 1 tests are CI-safe. Add to your pipeline:

```yaml
# GitHub Actions example
- name: Install Playwright
  run: |
    cd apps/hestia
    yarn playwright install chromium
    sudo apt-get install -y libasound2t64   # Ubuntu runners have sudo
- name: Run Tier 1 tests
  run: cd apps/hestia && yarn test:e2e
  env:
    CI: true
    NEXT_PUBLIC_ENABLE_FAUCET: true
    POLKADEX_CHAIN: ${{ secrets.POLKADEX_CHAIN }}
```

Tier 2 tests are **not** CI-suitable — they require a human at the keyboard for
extension signing. Run them locally before merging, or in a dedicated manual-approval
pipeline step.

---

## 10. Test Coverage Summary

| ID | Description | File | Automatable |
|---|---|---|---|
| AC-00 | Homepage title | `smoke.spec.ts` | ✅ fully |
| AC-04 | No-wallet gate on trading form | `validation/trading.spec.ts` | ✅ fully |
| AC-02 | Connect extension, address shows | `tier2/account.spec.ts` | 🟡 human: approve popup |
| AC-05 | Create trading account | `tier2/account.spec.ts` | 🟡 human: sign extrinsic |
| AC-06 | Balance shows on /balances | `tier2/account.spec.ts` | ✅ after setup |
| FA-01..FA-04 | Faucet drip each token | `validation/faucet-api.spec.ts` | ✅ REST-only |
| FA-05 | Rate-limit error | `validation/faucet-api.spec.ts` | ✅ REST-only |
| FA-06..FA-09 | Faucet form validation | `validation/faucet.spec.ts` | ✅ fully |
| FA-10 | Faucet disabled redirect | `validation/env-flags.spec.ts` | ✅ second server |
| HFT-13, HFT-14 | Bridge no-wallet states | `validation/bridge.spec.ts` | ✅ fully |
| HFT-15, HFT-21 | Bridge amount validation | `validation/bridge.spec.ts` | ✅ fully |
| HFT-01 | Connect MetaMask + Polkadot | `tier2/bridge.spec.ts` | 🟡 human: MetaMask |
| HFT-02, HFT-03 | Inbound bridge | `tier2/bridge.spec.ts` | 🟡 human: MetaMask |
| HFT-07 | Swap bridge direction | `tier2/bridge.spec.ts` | ✅ button click |
| HFT-08 | Outbound bridge extrinsic | `tier2/bridge.spec.ts` | 🟡 human: sign |
| HFT-16 | Exceeds balance | `tier2/bridge.spec.ts` | ✅ storageState |
| HFT-18, HFT-19 | Missing config / pallet errors | `tier2/bridge.spec.ts` | ✅ storageState |
| HFT-20 | Bridge maintenance screen | `validation/env-flags.spec.ts` | ✅ second server |
| IT-01..IT-03, IT-08, IT-09 | Deposit / withdraw | `tier2/internal-transfer.spec.ts` | 🟡 human: sign each |
| IT-06 | Amount=0 validation (with wallet) | `tier2/internal-transfer.spec.ts` | ✅ storageState |
| IT-07 | No trading account UI | `tier2/internal-transfer.spec.ts` | ✅ no wallet needed |
| PO-01..PO-12 | All order placement cases | `tier2/trading.spec.ts` | ✅ **fully automated** |
| EX-01..EX-05, EX-08, EX-09 | Transfer history rows | `tier2/explorer.spec.ts` | ✅ SubQuery-gated |
| EX-06, EX-07 | Empty state / error state | `tier2/explorer.spec.ts` | ✅ storageState |
