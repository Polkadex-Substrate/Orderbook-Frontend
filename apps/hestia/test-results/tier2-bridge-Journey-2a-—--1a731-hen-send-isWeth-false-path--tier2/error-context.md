# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tier2/bridge.spec.ts >> Journey 2a — Bridge Inbound (MetaMask required) >> HFT-02 — bridge WETH inbound: ERC-20 approval then send (isWeth=false path)
- Location: tests/e2e/tier2/bridge.spec.ts:75:7

# Error details

```
TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Transfer' })
    - locator resolved to <button disabled class="transition-colors duration-300 flex items-center justify-center whitespace-nowrap disabled:cursor-not-allowed disabled:select-none h-10 px-4 text-sm rounded-sm font-medium bg-primary-base enabled:hover:bg-primary-hover active:bg-primary-pressed text-white disabled:bg-disabled w-full py-5">Transfer</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
      - waiting 100ms
    58 × waiting for element to be visible, enabled and stable
       - element is not enabled
     - retrying click action
       - waiting 500ms

```

# Test source

```ts
  1   | import { test, expect } from "./fixtures";
  2   | import {
  3   |   suppressTestnetModal,
  4   |   signCue,
  5   |   SIGN_TIMEOUT,
  6   |   FUNDED_STATE_PATH,
  7   |   anyToast,
  8   |   visibleTooltip,
  9   | } from "./helpers";
  10  | 
  11  | // Journey 2 — Bridge (HFT-01, HFT-02, HFT-03, HFT-07, HFT-08, HFT-16..HFT-19)
  12  | //
  13  | // Popup types:
  14  | //   HFT-01 — MetaMask (connect): web3modal opens MetaMask or WalletConnect
  15  | //   HFT-02 — MetaMask x2: ERC-20 approval + send tx (isWeth=false path)
  16  | //   HFT-03 — MetaMask x1: send tx only (isWeth=true path, no ERC-20 approval)
  17  | //   HFT-07 — no popup (button click only)
  18  | //   HFT-08 — Polkadot.js extrinsic popup (hyperFungibleToken.send)
  19  | //   HFT-16 — no popup (validation with storageState)
  20  | //   HFT-17 — skip (recipient field investigation needed)
  21  | //   HFT-18 — no popup (error fires before tx — storageState for EVM source)
  22  | //   HFT-19 — no popup (error fires before tx — storageState for outbound)
  23  | 
  24  | // ---------------------------------------------------------------------------
  25  | // Inbound bridge (Sepolia → Polkadex) — requires MetaMask
  26  | // ---------------------------------------------------------------------------
  27  | 
  28  | test.describe.serial("Journey 2a — Bridge Inbound (MetaMask required)", () => {
  29  |   test.beforeEach(async ({ page }) => {
  30  |     await suppressTestnetModal(page);
  31  |     await page.goto("/bridge");
  32  |     await expect(
  33  |       page.getByRole("button", { name: "Transfer" })
  34  |     ).toBeVisible({ timeout: 15_000 });
  35  |   });
  36  | 
  37  |   // ─── HFT-01 — Connect MetaMask + Polkadot.js account ───────────────────────
  38  |   test("HFT-01 — connect MetaMask (EVM source) and Polkadot.js account (substrate destination)", async ({
  39  |     page,
  40  |   }) => {
  41  |     // The fixture loads Polkadot.js via --disable-extensions-except, which disables
  42  |     // MetaMask.  Skip this test when MetaMask is unavailable (no EVM wallet button).
  43  |     const hasEvmConnect = await page
  44  |       .getByRole("main")
  45  |       .getByRole("button", { name: "Connect wallet" })
  46  |       .isVisible({ timeout: 5_000 })
  47  |       .catch(() => false);
  48  |     test.skip(!hasEvmConnect, "MetaMask not available — EVM wallet button not found");
  49  | 
  50  |     // EVM side: click "Connect wallet" in the source row
  51  |     await page
  52  |       .getByRole("main")
  53  |       .getByRole("button", { name: "Connect wallet" })
  54  |       .click();
  55  | 
  56  |     signCue(
  57  |       "Approve the MetaMask (or WalletConnect) connection in the popup",
  58  |       "MetaMask (connect)"
  59  |     );
  60  | 
  61  |     // After MetaMask connected: EVM address shown (replaces "Account not present")
  62  |     await expect(
  63  |       page.getByText("Account not present")
  64  |     ).not.toBeVisible({ timeout: SIGN_TIMEOUT });
  65  | 
  66  |     // Substrate side: select an account from the AccountCombobox dropdown
  67  |     // (no popup needed — extension accounts are already enumerated)
  68  |     // The AccountCombobox shows a select/combobox for choosing the destination
  69  |     await expect(
  70  |       page.getByRole("button", { name: "Transfer" })
  71  |     ).toBeVisible();
  72  |   });
  73  | 
  74  |   // ─── HFT-02 — Bridge WETH inbound (isWeth=false: ERC-20 approval + send) ────
  75  |   test("HFT-02 — bridge WETH inbound: ERC-20 approval then send (isWeth=false path)", async ({
  76  |     page,
  77  |   }) => {
  78  |     // Amount field is auto-filled or the user types in it
  79  |     await page.locator('input[name="amount"]').fill("0.001");
> 80  |     await page.getByRole("button", { name: "Transfer" }).click();
      |                                                          ^ TimeoutError: locator.click: Timeout 30000ms exceeded.
  81  | 
  82  |     // Confirm dialog appears — click Sign and Submit
  83  |     await page
  84  |       .getByRole("button", { name: /sign.*submit/i })
  85  |       .click({ timeout: 10_000 });
  86  | 
  87  |     signCue(
  88  |       "Step 1 of 2: Approve WETH ERC-20 spend to the WrappedHFT contract",
  89  |       "MetaMask (approve ERC-20)"
  90  |     );
  91  | 
  92  |     // Wait for the approval tx to be accepted (MetaMask closes, dialog proceeds)
  93  |     await page.waitForTimeout(5_000);
  94  | 
  95  |     signCue(
  96  |       "Step 2 of 2: Confirm the send tx (msg.value = quote() fee in ETH)",
  97  |       "MetaMask (send tx)"
  98  |     );
  99  | 
  100 |     // After both MetaMask confirmations: success toast or tx hash shown
  101 |     await expect(anyToast(page)).toBeVisible({ timeout: SIGN_TIMEOUT });
  102 |   });
  103 | 
  104 |   // ─── HFT-03 — Bridge WETH inbound (isWeth=true: single ETH send, no approval) ─
  105 |   test("HFT-03 — bridge WETH inbound: single ETH send, no ERC-20 approval (isWeth=true path)", async ({
  106 |     page,
  107 |   }) => {
  108 |     // Only valid if the deployed WrappedHFT contract has isWeth=true
  109 |     // If your testnet contract has isWeth=false, this test will show an approval step
  110 |     await page.locator('input[name="amount"]').fill("0.001");
  111 |     await page.getByRole("button", { name: "Transfer" }).click();
  112 |     await page
  113 |       .getByRole("button", { name: /sign.*submit/i })
  114 |       .click({ timeout: 10_000 });
  115 | 
  116 |     signCue(
  117 |       "Confirm the single send tx (msg.value = amount + quote() in ETH, no prior approval)",
  118 |       "MetaMask (send tx)"
  119 |     );
  120 | 
  121 |     await expect(anyToast(page)).toBeVisible({ timeout: SIGN_TIMEOUT });
  122 |   });
  123 | });
  124 | 
  125 | // ---------------------------------------------------------------------------
  126 | // HFT-07 — Swap direction (no popup)
  127 | // ---------------------------------------------------------------------------
  128 | 
  129 | test("HFT-07 — swap bridge direction: Sepolia→Polkadex becomes Polkadex→Sepolia", async ({
  130 |   page,
  131 | }) => {
  132 |   await suppressTestnetModal(page);
  133 |   await page.goto("/bridge");
  134 |   await expect(
  135 |     page.getByRole("button", { name: "Transfer" })
  136 |   ).toBeVisible({ timeout: 15_000 });
  137 | 
  138 |   // Default: EVM (Sepolia) is source. Swap arrow is between the chain rows.
  139 |   // TODO: confirm exact selector for the swap/arrow button
  140 |   // It is typically an icon button between the source and destination cards
  141 |   const swapBtn = page
  142 |     .locator("button")
  143 |     .filter({ has: page.locator('[class*="arrow"], [class*="swap"], svg') })
  144 |     .first();
  145 |   await swapBtn.click();
  146 | 
  147 |   // After swap: Polkadex is now the source, Sepolia is destination
  148 |   // "Account not present" for EVM side should now be on the DESTINATION row
  149 |   // and the source row should show the Polkadex account (or prompt to connect)
  150 |   await expect(page.getByText("Account not present").first()).toBeVisible({
  151 |     timeout: 5_000,
  152 |   });
  153 | });
  154 | 
  155 | // ---------------------------------------------------------------------------
  156 | // HFT-08 — Outbound bridge (Polkadex → Sepolia) — requires Polkadot.js extension
  157 | // ---------------------------------------------------------------------------
  158 | 
  159 | test.describe("Journey 2b — Bridge Outbound (Polkadot.js required)", () => {
  160 |   test("HFT-08 — submit outbound WETH bridge (hyperFungibleToken.send extrinsic)", async ({
  161 |     page,
  162 |   }) => {
  163 |     await suppressTestnetModal(page);
  164 |     await page.goto("/bridge");
  165 |     await expect(
  166 |       page.getByRole("button", { name: "Transfer" })
  167 |     ).toBeVisible({ timeout: 15_000 });
  168 | 
  169 |     // Swap to outbound direction (Polkadex → Sepolia) using the same selector
  170 |     // that HFT-07 uses successfully.  The plain svg filter picks up too many
  171 |     // unrelated icon buttons — arrow/swap class names narrow it down correctly.
  172 |     const swapBtn = page
  173 |       .locator("button")
  174 |       .filter({ has: page.locator('[class*="arrow"], [class*="swap"], svg') })
  175 |       .first();
  176 |     await swapBtn.click();
  177 | 
  178 |     // Enter amount
  179 |     await page.locator('input[name="amount"]').fill("0.001");
  180 |     await page.getByRole("button", { name: "Transfer" }).click();
```