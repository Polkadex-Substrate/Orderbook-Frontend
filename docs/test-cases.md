# Polkadex Testnet — Functional Test Case Specification

**Environment:** Testnet  
**Scope:** End-to-end user journey from account creation through cross-chain bridging, trading, and exit  
**Verification:** Where a chain action is involved, the expected on-chain result is verified via the SubQuery indexer (`INDEXER_URL`) or the HyperBridge ISMP indexer (`BRIDGE_INDEXER_URL`) unless noted otherwise.

---

## Systems Reference

| System | Role | Access |
|---|---|---|
| **Frontend (hestia)** | The DEX UI — all user interactions happen here | Browser |
| **Faucet API** | REST API that drips testnet tokens | Called by frontend at `/api/register` + `/api/drip` |
| **Polkadex Chain** | Substrate chain — executes on-chain state changes | Via Polkadot.js extension |
| **SubQuery Indexer** | Indexes Polkadex on-chain transfers; queried by Transfer History UI | `NEXT_PUBLIC_SUBSCAN_URL` env var |
| **HyperBridge ISMP Indexer** | Tracks cross-chain ISMP request status | `NEXT_PUBLIC_BRIDGE_INDEXER_URL` env var |
| **Sepolia (EVM)** | Ethereum testnet — source/destination for bridge | Via MetaMask |

---

## Prerequisites & Test Environment Setup

Before executing any test case, verify the following:

**Wallets**
- [ ] Polkadot.js / Talisman / SubWallet extension installed in browser
- [ ] MetaMask (or Enkrypt) installed with a Sepolia account funded with SepoliaETH (for gas) and testnet WETH
- [ ] Both wallets are unlocked and connected to testnet networks

**Application**
- [ ] `NEXT_PUBLIC_ENABLE_FAUCET=true` — faucet route accessible
- [ ] `NEXT_PUBLIC_IS_HYPERBRIDGE_MAINTENANCE` is NOT `"true"` (tracked in `turbo.json` build env)
- [ ] `NEXT_PUBLIC_HYPERBRIDGE_MAINTENANCE_MESSAGE` set if testing maintenance mode (tracked in `turbo.json`)
- [ ] `NEXT_PUBLIC_BRIDGE_WETH_HFT_ADDRESS` is set to the `WrappedHyperFungibleToken.sol` contract address (obtain from Hyperbridge team)
- [ ] `NEXT_PUBLIC_ENABLE_LMP` set per test environment
- [ ] App is loading without JS console errors on initial load
- [ ] TestnetModal appears after a brief delay on initial load — it is loaded client-side only (`ssr: false` in `DynamicProviders`), not in the initial server HTML

**Test Data**
- [ ] Note the Polkadex substrate address used for testing (SS58 format, 48 chars)
- [ ] Note the Sepolia EVM address used for testing (0x format, 42 chars)
- [ ] Confirm Sepolia WETH contract: `0x7b79995e5f793a07bc00c21412e50ecae098e7f9`
- [ ] Confirm `WrappedHyperFungibleToken.sol` contract address matches `NEXT_PUBLIC_BRIDGE_WETH_HFT_ADDRESS`

**E2E Automation (Playwright)**
- Run automated tests: `yarn workspace @orderbook/hestia test:e2e`
- Config: `apps/hestia/playwright.config.ts` — Chromium, `localhost:3000`, test files in `tests/e2e/`
- Automated cases are marked **[auto]** below. All other cases require manual execution (wallet extensions cannot be driven programmatically without additional tooling).
- Ensure dev server is running (`yarn dev`) or let Playwright start it automatically via `webServer` config.

---

## Journey 0 — Account Setup

**Objective:** Create a Polkadex Funding account and derive a Trading (proxy) account from it.  
**Dependency:** None — this is the starting point for all other journeys.

### App Load & Environment

| ID | Type | Description | Preconditions | Steps | Expected Result | Chain Verification |
|---|---|---|---|---|---|---|
| AC-00 | Positive | **[auto]** Homepage loads with correct page title | Dev server running | 1. Navigate to `/`. | Page title matches `/Polkadex Orderbook/`. No JS errors in console. Existing automated: `tests/e2e/smoke.spec.ts`. | N/A |
| AC-00b | Positive | TestnetModal appears after hydration | Testnet environment, app loaded | 1. Navigate to `/`. 2. Wait for client-side hydration. | TestnetModal overlay appears after a brief delay (not in initial HTML — loads via `DynamicProviders` with `ssr: false`). | N/A |

### Funding Account

| ID | Type | Description | Preconditions | Steps | Expected Result | Chain Verification |
|---|---|---|---|---|---|---|
| AC-01 | Positive | Create a new Polkadot-spec wallet and import into extension | Browser extension installed | 1. Open Polkadot.js extension. 2. Generate new account (12/24-word mnemonic). 3. Save mnemonic securely. 4. Account appears in extension with a substrate address. | Account visible in extension with SS58 address. | N/A — wallet-side action only |
| AC-02 | Positive | Funding account appears in app after connecting extension | AC-01 complete | 1. Navigate to app. 2. Click "Connect Wallet". 3. Select Polkadot.js extension. 4. Approve connection. | Account address shown in header. Balances page loads for that address. | N/A |
| AC-03 | Negative | Connect wallet with no accounts in extension | Extension installed but empty | 1. Click "Connect Wallet". 2. Approve extension connection. | UI shows "No accounts found" or prompts to add an account. No crash. | N/A |
| AC-04 | Negative | Attempt to use app features without connecting wallet | Fresh browser session | 1. Navigate to `/trading`. 2. Attempt to place an order without connecting wallet. | Order form is disabled or prompts "Connect wallet". No order submitted. | N/A |

### Trading Account

> Trading account = a proxy account derived from the funding account. Requires a small PDEX deposit for the proxy bond.

| ID | Type | Description | Preconditions | Steps | Expected Result | Chain Verification |
|---|---|---|---|---|---|---|
| AC-05 | Positive | Create Trading account from connected Funding account | AC-02 complete, funding account has sufficient PDEX (from faucet — run J1 first) | 1. Navigate to account/profile section. 2. Click "Create Trading Account". 3. Approve the proxy registration transaction in extension. | Trading account created. UI confirms success. Trading features unlocked. | SubQuery: proxy-added event from the funding account address. |
| AC-06 | Positive | Trading account balance initialised with deposit | AC-05 complete | 1. Navigate to `/balances`. 2. Check Trading Account column for PDEX. | Small PDEX balance visible in the Trading Account column matching the deposit amount. | SubQuery: deposit transfer to the proxy address visible. |
| AC-07 | Negative | Create Trading account with insufficient PDEX for proxy bond | Funding account balance < proxy bond requirement | 1. Attempt to create Trading Account. 2. Sign the transaction. | Transaction fails. UI shows error message indicating insufficient balance. No proxy created. | SubQuery: no proxy event from the address. |
| AC-08 | Boundary | Create Trading account with exactly the minimum required PDEX | Funding account holds exactly the minimum bond amount | 1. Attempt to create Trading Account. 2. Sign and submit. | Transaction succeeds. Trading account created. | SubQuery: proxy-added event present. |

---

## Journey 1 — Faucet

**Objective:** Request testnet tokens (PDEX, WETH, USDC, USDT) for a wallet address.  
**Dependency:** None — does not require an existing account on-chain.

| ID | Type | Description | Preconditions | Steps | Expected Result | Indexer Verification |
|---|---|---|---|---|---|---|
| FA-01 | Positive | Request PDEX tokens for a valid address | App loaded, `/faucet` accessible | 1. Navigate to `/faucet`. 2. Select PDEX token. 3. Enter a valid Polkadex substrate address. 4. Click "Request Tokens". | Success toast: "Tokens Sent! `<amount>` has been sent to your wallet". Form resets. | SubQuery: PDEX transfer to the target address appears within ~30s–2min. |
| FA-02 | Positive | Request WETH tokens | Same as FA-01 | Repeat FA-01 steps selecting WETH. | Success toast with WETH amount. | SubQuery: WETH transfer to address visible. |
| FA-03 | Positive | Request USDC tokens | Same as FA-01 | Repeat FA-01 steps selecting USDC. | Success toast with USDC amount. | SubQuery: USDC transfer visible. |
| FA-04 | Positive | Request USDT tokens | Same as FA-01 | Repeat FA-01 steps selecting USDT. | Success toast with USDT amount. | SubQuery: USDT transfer visible. |
| FA-05 | Negative | Request same token twice within the rate-limit window | FA-01 completed for PDEX | 1. Immediately repeat FA-01 for PDEX. | Error toast with rate-limit message. Form re-enabled. No second transfer. | SubQuery: only one PDEX transfer to the address in that window. |
| FA-06 | Negative | Submit with no token selected | `/faucet` loaded | 1. Enter a valid address. 2. Do NOT select a token. 3. Attempt submit. | Button remains disabled OR validation error "Please select a token". No API call made. | N/A |
| FA-07 | Negative | Submit with empty wallet address | `/faucet` loaded | 1. Select a token. 2. Leave address field empty. 3. Attempt submit. | Validation error "Wallet address is required". Button disabled. | N/A |
| FA-08 | Negative | Submit with address shorter than 30 characters | `/faucet` loaded | 1. Select token. 2. Enter 29-character string. 3. Attempt submit. | Validation error "Enter a valid wallet address". | N/A |
| FA-09 | Boundary | Submit with address exactly 30 characters | `/faucet` loaded | 1. Enter a 30-character address string. 2. Select token. 3. Submit. | Form accepts and submits. API may still reject if not a valid substrate address — that is an API-layer concern. | N/A |
| FA-10 | Boundary | Access `/faucet` with `NEXT_PUBLIC_ENABLE_FAUCET=false` | Env var set to false | 1. Navigate to `/faucet`. | Middleware redirects to `/`. Faucet page never loads. | N/A |

---

## Journey 2 — Bridge

**Objective:** Bridge WETH between Sepolia (EVM) and Polkadex (Substrate) using the HyperBridge HFT protocol.  
**UI:** `/bridge` page — same form for both directions.  
**Library:** `pallet-hyper-fungible-token` + `WrappedHyperFungibleToken.sol`  
**ISMP Status stages:** `SOURCE_FINALIZED` → `HYPERBRIDGE_DELIVERED` → `HYPERBRIDGE_FINALIZED` → `DESTINATION_DELIVERED`

**Architecture:**

| Aspect | Detail |
|---|---|
| Substrate pallet | `pallet-hyper-fungible-token` |
| Substrate extrinsic | `hyperFungibleToken.send` |
| EVM contract | `WrappedHyperFungibleToken.sol` (address from `NEXT_PUBLIC_BRIDGE_WETH_HFT_ADDRESS`) |
| EVM fee | `quote()` on WrappedHFT contract; paid as native ETH via `msg.value` |
| inbound isWeth=false | Approve WETH ERC20 to WrappedHFT (maxUint256) + ETH msg.value = `quote()` |
| inbound isWeth=true | No ERC20 approval — ETH msg.value = `amount + quote()` (contract wraps internally) |
| Outbound relayer fee | ~0.12% of bridge amount |
| Timeout | 3600s |

### Inbound (Sepolia → Polkadex)

| ID | Type | Description | Preconditions | Steps | Expected Result | Indexer Verification |
|---|---|---|---|---|---|---|
| HFT-01 | Positive | Connect MetaMask (EVM source) and Polkadot.js (Substrate destination) | `NEXT_PUBLIC_BRIDGE_WETH_HFT_ADDRESS` set, MetaMask on Sepolia, Polkadot.js extension connected | 1. Navigate to `/bridge`. 2. Select "Sepolia Testnet" as source. 3. Connect MetaMask — approve. 4. Select "Polkadex Testnet" as destination. 5. Select substrate account from dropdown. | MetaMask EVM address shown under "From". Polkadex address shown under "To". | N/A |
| HFT-02 | Positive | Bridge WETH inbound — isWeth=false path (ERC20 approval) | HFT-01 complete, WETH ERC20 balance on Sepolia, `isWeth=false` on deployed WrappedHFT contract | 1. Select WETH and enter amount on `/bridge`. 2. Click "Transfer" → "Confirm". 3. MetaMask prompts WETH approval to WrappedHFT contract address — approve (maxUint256). 4. MetaMask prompts `send` tx with native ETH as msg.value (fee only from `quote()`). 5. Confirm. | Tx submitted. WETH approval event on Sepolia. `PostRequestEvent` emitted on ISMP Host. | Sepolia: WETH approval event to WrappedHFT address; `PostRequestEvent` on ISMP Host contract. HyperBridge ISMP indexer: request reaches `DESTINATION_DELIVERED`. |
| HFT-03 | Positive | Bridge WETH inbound — isWeth=true path (native ETH, no ERC20 approval) | HFT-01 complete, ETH balance on Sepolia, `isWeth=true` on deployed WrappedHFT contract | 1. Select WETH and enter amount on `/bridge`. 2. Click "Transfer" → "Confirm". 3. No ERC20 approval prompt — MetaMask prompts `send` tx with native ETH as msg.value (`amount + quote()` in ETH). 4. Confirm. | Tx submitted. No WETH ERC20 approval event. `PostRequestEvent` emitted on ISMP Host. | Sepolia: `PostRequestEvent` on ISMP Host. No WETH approval event. HyperBridge ISMP indexer: request reaches `DESTINATION_DELIVERED`. |
| HFT-04 | Positive | WETH minted on Polkadex after `DESTINATION_DELIVERED` | HFT-02 or HFT-03 complete, ISMP delivery confirmed | 1. Wait for `DESTINATION_DELIVERED` status. 2. Navigate to `/balances`. | WETH balance appears on Polkadex (assetId: 3). Amount matches sent minus relayer fee. Displayed in human-readable units. | SubQuery: mint/credit event to the Polkadex destination address for WETH (assetId: 3). |
| HFT-05 | Positive | ISMP relay stages progress in order (inbound) | HFT-02 or HFT-03 complete | 1. Note the commitment hash from the bridge tx. 2. Monitor HyperBridge ISMP indexer. | Statuses progress: `SOURCE_FINALIZED` → `HYPERBRIDGE_DELIVERED` → `HYPERBRIDGE_FINALIZED` → `DESTINATION_DELIVERED` within ~10–15 min. | HyperBridge indexer: `queryRequestWithStatus(commitment)` returns all 4 statuses in order. |
| HFT-06 | Positive | Fee estimation shown in confirm dialog before submission | HFT-01 complete, amount entered | 1. Enter an amount on `/bridge`. 2. Open the "Confirm Transaction" dialog (before signing). | Estimated fee shown in ETH (derived from `quote()` on WrappedHFT). If `quote()` reverts, fee shows as 0 (graceful fallback). | N/A — UI-only check. |

### Outbound (Polkadex → Sepolia)

| ID | Type | Description | Preconditions | Steps | Expected Result | Indexer Verification |
|---|---|---|---|---|---|---|
| HFT-07 | Positive | Switch bridge direction to Polkadex → Sepolia | `/bridge` loaded, both wallets connected | 1. Click the swap/arrow button between source and destination. | Source becomes "Polkadex Testnet", destination becomes "Sepolia Testnet". Substrate account shown as source, EVM address as destination. | N/A |
| HFT-08 | Positive | Submit outbound WETH bridge (Polkadex → Sepolia) | HFT-07 complete, WETH (assetId: 3) in Polkadex funding account | 1. Select WETH. 2. Enter amount. 3. Click "Transfer" → review fees in confirm dialog (relayer fee shown as ~0.12% of amount). 4. Accept terms checkbox. 5. Click "Sign and Submit". 6. Polkadot.js extension prompts `hyperFungibleToken.send` extrinsic with params: `assetId: 3`, `destination: EVM-11155111`, `recipient: <EVM 0x address>`, `relayerFee: ~0.12% of amount`, `timeout: 3600s`, `callData: null`. 7. Confirm in extension. | Transaction dispatched. Tx hash (block hash) shown. Polkadex WETH balance decreases. Success alert: "These tokens will reflect in your Funding wallet in 2-3 mins". | SubQuery: `hyperFungibleToken.send` extrinsic from Polkadex address for WETH (assetId: 3). HyperBridge ISMP indexer: ISMP request emitted from Polkadex. |
| HFT-09 | Positive | ISMP relay stages progress in order (outbound) | HFT-08 complete | 1. Monitor HyperBridge ISMP indexer with the commitment from HFT-08. | Statuses: `SOURCE_FINALIZED` → `HYPERBRIDGE_DELIVERED` → `HYPERBRIDGE_FINALIZED` → `DESTINATION_DELIVERED` within ~10–15 min. | HyperBridge indexer: `queryRequestWithStatus(commitment)` shows all 4 stages. |
| HFT-10 | Positive | Token received on Sepolia after outbound delivery | HFT-09 complete (`DESTINATION_DELIVERED`) | 1. Open MetaMask on Sepolia. 2. Check ETH balance (if `isWeth=true` on WrappedHFT) or add WETH token contract and check ERC20 balance (if `isWeth=false`). | Balance increased by bridged amount minus relayer fee. | Sepolia Etherscan: release/mint event on `WrappedHyperFungibleToken.sol` to recipient EVM address. |
| HFT-11 | Positive | Polkadex WETH balance reduced immediately after outbound tx | HFT-08 complete | 1. Navigate to `/balances` on Polkadex after tx is in-block. | WETH (assetId: 3) funding account balance decreased by the bridged amount. | SubQuery: WETH balance reduction for the Polkadex address. |
| HFT-12 | Positive | Timeout recovery: undelivered ISMP request restores balance | Outbound submitted, timeout elapsed without delivery | 1. Submit outbound bridge. 2. Wait past timeout (3600s — test env only, use minimal timeout). 3. Submit timeout message via `pallet-ismp`. | Escrowed/burned tokens returned to sender. | HyperBridge ISMP indexer: `HYPERBRIDGE_TIMED_OUT` status. SubQuery: balance restored on Polkadex address. |

### Negative & Boundary

| ID | Type | Description | Preconditions | Steps | Expected Result | Indexer Verification |
|---|---|---|---|---|---|---|
| HFT-13 | Negative | Bridge with MetaMask not connected | `/bridge` loaded | 1. Select Sepolia as source but do not connect MetaMask. 2. Attempt to submit. | "Transfer" button disabled. EVM account row shows "Account not present" + "Connect wallet" button. | N/A |
| HFT-14 | Negative | Bridge with Polkadot.js not connected | `/bridge` loaded | 1. Select Polkadex as destination. 2. No account selected. 3. Attempt submit. | "Transfer" button disabled. | N/A |
| HFT-15 | Negative | Amount = 0 | Both wallets connected | 1. Type "0" in amount field. | Validation error. Button disabled. | N/A |
| HFT-16 | Negative | Amount exceeds available balance | Known balance = X | 1. Enter X + 1 as amount. | Validation error "Exceeds available balance". Button disabled. | N/A |
| HFT-17 | Negative | Outbound recipient EVM address not starting with 0x | Outbound direction selected | 1. Manually enter a recipient address not starting with "0x". 2. Attempt submit. | Error: "Recipient must be an EVM address starting with 0x". No tx submitted. | N/A |
| HFT-18 | Negative | `NEXT_PUBLIC_BRIDGE_WETH_HFT_ADDRESS` env var not set | Env var missing or empty | 1. Attempt to initiate inbound bridge. 2. Click "Transfer" → "Confirm" → "Sign and Submit". | Error: "NEXT_PUBLIC_BRIDGE_WETH_HFT_ADDRESS is not set. Obtain the WrappedHFT contract address from the Hyperbridge team." No MetaMask prompt. No tx submitted. | N/A |
| HFT-19 | Negative | Outbound on Polkadex node without `hyperFungibleToken` pallet | Connected to a Polkadex node that has not deployed the HFT pallet | 1. Attempt to submit outbound transfer. | Error: "`hyperFungibleToken.send` extrinsic not found on this Polkadex node. The chain may not have deployed the HFT pallet yet." No tx submitted. | N/A |
| HFT-20 | Negative | Bridge page shows maintenance screen | `NEXT_PUBLIC_IS_HYPERBRIDGE_MAINTENANCE=true` | 1. Navigate to `/bridge`. | Maintenance message displayed. Form hidden. Bridge not accessible. | N/A |
| HFT-21 | Negative | Amount below minimum threshold | Known minimum threshold from `transferConfig` | 1. Enter amount 1 unit below minimum. 2. Attempt submit. | Validation error prevents submission. | N/A |
| HFT-22 | Boundary | Bridge exactly the minimum allowed amount | Min amount from `transferConfig.min` | 1. Enter exact minimum amount. 2. Submit. | Transfer proceeds. No validation error. | SubQuery: transfer event with min amount visible on Polkadex. |
| HFT-23 | Boundary | Bridge exact full balance using MAX button | Sufficient balance present | 1. Click "MAX" button. 2. Verify amount populates with max allowed. 3. Submit. | Transfer proceeds. Source balance = 0 after delivery. | SubQuery: full amount event on Polkadex. |

---

## Journey 3 — Internal Transfer (Funding ↔ Trading Account)

**Objective:** Move tokens between the funding (on-chain) account and the trading (proxy) account.  
**Dependency:** AC-05 (Trading account exists), FA-01 or HFT-04 (tokens present in funding account).

| ID | Type | Description | Preconditions | Steps | Expected Result | Indexer Verification |
|---|---|---|---|---|---|---|
| IT-01 | Positive | Deposit PDEX from Funding to Trading account | PDEX in funding account, trading account exists | 1. Navigate to `/transfer`. 2. Select "Funding → Trading". 3. Select PDEX. 4. Enter amount. 5. Confirm in extension. | Trading account PDEX balance increases. Funding account balance decreases by same amount. | SubQuery: transfer from funding address to trading proxy address with PDEX asset. |
| IT-02 | Positive | Deposit WETH from Funding to Trading account | WETH in funding account (from faucet or bridge) | 1. Same flow as IT-01 but select WETH. | WETH available in trading account. | SubQuery: WETH transfer to proxy address. |
| IT-03 | Positive | Withdraw PDEX from Trading to Funding account | PDEX in trading account | 1. Select "Trading → Funding". 2. Select PDEX. 3. Enter amount. 4. Confirm. | Funding account PDEX increases. Trading account PDEX decreases. | SubQuery: transfer from proxy address back to funding address. |
| IT-04 | Positive | Transfer history shows deposit in `/transfer` History tab | IT-01 complete | 1. Navigate to `/transfer`, History tab. | Row for the IT-01 deposit appears with correct: from, to, asset, amount, timestamp. | Same SubQuery event visible in the Transfer History UI. |
| IT-05 | Negative | Deposit amount exceeds funding account balance | Low balance | 1. Enter amount greater than available balance. | Validation error or transaction rejected. No transfer executed. | SubQuery: no new transfer event. |
| IT-06 | Negative | Deposit amount = 0 | Any state | 1. Enter 0 in amount field. | Form validation blocks submission. | N/A |
| IT-07 | Negative | Attempt deposit without trading account created | No trading account | 1. Try to select "Trading" as destination. | UI hides the option or shows prompt to create a trading account first. | N/A |
| IT-08 | Boundary | Deposit exact full funding balance | Funding balance = X | 1. Enter exact full balance X. 2. Confirm. | Transfer succeeds. Funding account balance = 0 for that asset. Trading balance = X. | SubQuery: full amount transferred. |
| IT-09 | Boundary | Deposit 1 smallest unit (1 planck for PDEX = 10^-12) | Any state with balance | 1. Enter minimum unit value. 2. Confirm. | Transfer succeeds. No rounding error. | SubQuery: transfer of 1 planck visible. |

---

## Journey 4 — Place Order (Trading)

**Objective:** Place a limit or market order on the DEX using tokens in the trading account.  
**Dependency:** IT-01 (tokens in trading account), trading account active.

| ID | Type | Description | Preconditions | Steps | Expected Result | Indexer Verification |
|---|---|---|---|---|---|---|
| PO-01 | Positive | Place a limit buy order | PDEX in trading account, WETH/PDEX market active | 1. Navigate to `/trading/WETHPDEX`. 2. Select "Limit" order type. 3. Set price and quantity. 4. Click "Buy WETH". 5. Confirm in extension. | Order appears in "Open Orders" tab with correct price, quantity, and side. | GraphQL API (orderbook backend): query open orders for the trading account address — order entry present. |
| PO-02 | Positive | Place a limit sell order | WETH in trading account | 1. Select "Limit". 2. Set price and quantity. 3. Click "Sell WETH". 4. Confirm. | Order appears in "Open Orders" tab as a sell order. | GraphQL API: sell order visible in open orders. |
| PO-03 | Positive | Place a market buy order | PDEX in trading account, asks exist in orderbook | 1. Select "Market" order type. 2. Enter quantity. 3. Click "Buy". 4. Confirm. | Order submitted. If matched, appears in "Order History" as filled. | GraphQL API: order in history with status FILLED or PARTIALLY_FILLED. |
| PO-04 | Positive | Cancel an open order | PO-01 complete | 1. In "Open Orders" tab, click Cancel on the order. 2. Confirm in extension. | Order removed from "Open Orders". Appears in "Order History" with status CANCELLED. | GraphQL API: order status updated to CANCELLED. |
| PO-05 | Positive | Cancelled order releases reserved balance back to trading account | PO-04 complete | 1. Check `/balances` trading account after cancellation. | Reserved balance returned. Available PDEX increases by the cancelled order's value. | N/A — balance check via UI. |
| PO-06 | Negative | Place order with insufficient balance | Trading account balance < order value | 1. Enter quantity/price requiring more than available balance. 2. Submit. | Error shown. Order rejected. Not visible in Open Orders. | GraphQL API: no new order entry. |
| PO-07 | Negative | Place order with quantity = 0 | Any state | 1. Enter 0 in quantity field. | Form validation blocks submission. Button disabled. | N/A |
| PO-08 | Negative | Place order with price = 0 (limit order) | Any state | 1. Set price = 0 in limit order. | Form validation blocks submission. | N/A |
| PO-09 | Negative | Place order without active trading account session | Session expired or trading account removed | 1. Attempt to place an order. | Error prompt: session or trading account required. | N/A |
| PO-10 | Boundary | Place order with exact available balance (full balance order) | Known trading balance | 1. Use MAX button or enter exact balance. 2. Submit. | Order accepted. Trading account available balance = 0 (fully reserved). | GraphQL API: order visible with full amount. |
| PO-11 | Boundary | Place order with minimum allowed quantity for the market | Min tick size known | 1. Enter the minimum quantity for the pair. 2. Submit. | Order accepted without validation error. | GraphQL API: order with minimum quantity visible. |
| PO-12 | Boundary | Place order with quantity 1 unit below minimum | Min quantity = N | 1. Enter N - 1 smallest unit. 2. Attempt submit. | Validation error or rejection. Order not placed. | N/A |

---

## Journey 5 — Explorer / Transfer History Cross-Verification

**Objective:** Verify that all on-chain events from previous journeys are correctly indexed and visible in the Transfer History UI.  
**Dependency:** At least J1 (Faucet) and J3 (Internal Transfer) completed. SubQuery indexer URL configured.

| ID | Type | Description | Preconditions | Steps | Expected Result | Indexer Verification |
|---|---|---|---|---|---|---|
| EX-01 | Positive | Faucet drip transfer visible in Transfer History | FA-01 complete | 1. Navigate to `/transfer`, History tab. | Faucet transfer row: correct from (faucet address), to (test address), asset (PDEX), amount, timestamp. | SubQuery API: `fetchTransfers(url, address, 0, 10)` returns the faucet transfer. |
| EX-02 | Positive | Inbound bridge transfer visible after HFT-04 | HFT-04 complete | 1. Check Transfer History for WETH. | WETH transfer row showing the bridge delivery to the Polkadex destination address. | SubQuery: asset WETH (assetId: 3), to = test address. |
| EX-03 | Positive | Internal deposit visible after IT-01 | IT-01 complete | 1. Check Transfer History. | Transfer from funding address to trading proxy address for PDEX with correct amount and timestamp. | SubQuery: from = funding address, to = proxy address. |
| EX-04 | Positive | Outbound bridge burn/escrow event visible after HFT-08 | HFT-08 complete | 1. Check Transfer History for WETH outbound. | WETH transfer from Polkadex address with correct amount and transferType indicating outbound exit. | SubQuery: WETH (assetId: 3) transfer from test address with outbound transfer type. |
| EX-05 | Positive | Pagination loads next page for high-volume address | Address with > 1 page of transfers | 1. Scroll down in Transfer History. 2. Trigger next page load. | Next page loads. New rows appear. No duplicate rows. Total count matches. | SubQuery: `fetchTransfers(url, address, offset=pageSize, limit=pageSize)` returns next batch. |
| EX-06 | Negative | Address with no transfers shows empty state | Fresh address with no txns | 1. Connect a brand new wallet with no history. 2. Navigate to Transfer History. | "No result found" empty state shown. No error. No crash. | SubQuery: `fetchTransfers` returns `{ count: 0, transfers: [] }`. |
| EX-07 | Negative | SubQuery indexer URL misconfigured | `NEXT_PUBLIC_SUBSCAN_URL` set to invalid URL | 1. Navigate to Transfer History. | Empty state or graceful error message. No crash. No raw error exposed to user. | Direct API call to misconfigured URL returns connection error. |
| EX-08 | Boundary | Very recent transfer (< 30 seconds ago) may not be indexed yet | Transfer submitted just now | 1. Immediately check Transfer History after submitting a transfer. | Transfer may not appear yet. No error shown. Re-check after ~1–2 minutes. | SubQuery: retry after 30s — transfer should appear. |
| EX-09 | Boundary | Transfer timestamp accuracy | Any completed transfer | 1. Note the approximate on-chain submission time. 2. Check timestamp in Transfer History. | Displayed timestamp matches chain block timestamp within ±1 block (~6 seconds). | SubQuery: `block_timestamp` field matches chain block time. |

---

## Test Execution Checklist

| Journey | ID | Pass | Fail | Blocked | Notes |
|---|---|---|---|---|---|
| Account Setup | AC-00 [auto] | | | | |
| Account Setup | AC-00b | | | | |
| Account Setup | AC-01 | | | | |
| Account Setup | AC-02 | | | | |
| Account Setup | AC-03 | | | | |
| Account Setup | AC-04 | | | | |
| Account Setup | AC-05 | | | | |
| Account Setup | AC-06 | | | | |
| Account Setup | AC-07 | | | | |
| Account Setup | AC-08 | | | | |
| Faucet | FA-01 | | | | |
| Faucet | FA-02 | | | | |
| Faucet | FA-03 | | | | |
| Faucet | FA-04 | | | | |
| Faucet | FA-05 | | | | |
| Faucet | FA-06 | | | | |
| Faucet | FA-07 | | | | |
| Faucet | FA-08 | | | | |
| Faucet | FA-09 | | | | |
| Faucet | FA-10 | | | | |
| Bridge | HFT-01 | | | | |
| Bridge | HFT-02 | | | | |
| Bridge | HFT-03 | | | | |
| Bridge | HFT-04 | | | | |
| Bridge | HFT-05 | | | | |
| Bridge | HFT-06 | | | | |
| Bridge | HFT-07 | | | | |
| Bridge | HFT-08 | | | | |
| Bridge | HFT-09 | | | | |
| Bridge | HFT-10 | | | | |
| Bridge | HFT-11 | | | | |
| Bridge | HFT-12 | | | | |
| Bridge | HFT-13 | | | | |
| Bridge | HFT-14 | | | | |
| Bridge | HFT-15 | | | | |
| Bridge | HFT-16 | | | | |
| Bridge | HFT-17 | | | | |
| Bridge | HFT-18 | | | | |
| Bridge | HFT-19 | | | | |
| Bridge | HFT-20 | | | | |
| Bridge | HFT-21 | | | | |
| Bridge | HFT-22 | | | | |
| Bridge | HFT-23 | | | | |
| Internal Transfer | IT-01 | | | | |
| Internal Transfer | IT-02 | | | | |
| Internal Transfer | IT-03 | | | | |
| Internal Transfer | IT-04 | | | | |
| Internal Transfer | IT-05 | | | | |
| Internal Transfer | IT-06 | | | | |
| Internal Transfer | IT-07 | | | | |
| Internal Transfer | IT-08 | | | | |
| Internal Transfer | IT-09 | | | | |
| Place Order | PO-01 | | | | |
| Place Order | PO-02 | | | | |
| Place Order | PO-03 | | | | |
| Place Order | PO-04 | | | | |
| Place Order | PO-05 | | | | |
| Place Order | PO-06 | | | | |
| Place Order | PO-07 | | | | |
| Place Order | PO-08 | | | | |
| Place Order | PO-09 | | | | |
| Place Order | PO-10 | | | | |
| Place Order | PO-11 | | | | |
| Place Order | PO-12 | | | | |
| Explorer | EX-01 | | | | |
| Explorer | EX-02 | | | | |
| Explorer | EX-03 | | | | |
| Explorer | EX-04 | | | | |
| Explorer | EX-05 | | | | |
| Explorer | EX-06 | | | | |
| Explorer | EX-07 | | | | |
| Explorer | EX-08 | | | | |
| Explorer | EX-09 | | | | |

---

## Execution Order (Dependency Chain)

```
AC-01 → AC-02
              ↓
         FA-01..FA-04  (get PDEX + WETH — needed for proxy bond and trading)
              ↓
         AC-05 → AC-06  (create trading account — needs PDEX from FA-01)
              ↓
    ┌─────────┴──────────────┐
    ↓                        ↓
HFT-01..HFT-12           IT-01..IT-04
(bridge WETH in           (deposit faucet tokens
 and back out)             to trading account)
    ↓                        ↓
IT-02 (deposit              PO-01..PO-12
 bridged WETH               (place orders with
 to trading)                 deposited tokens)
    ↓
EX-01..EX-09  (verify all above events visible in Transfer History)
```

**Total: 73 test cases**  
(10 Account Setup + 10 Faucet + 23 Bridge + 9 Internal Transfer + 12 Place Order + 9 Explorer)  
**Automated (Playwright):** AC-00 — `tests/e2e/smoke.spec.ts`
