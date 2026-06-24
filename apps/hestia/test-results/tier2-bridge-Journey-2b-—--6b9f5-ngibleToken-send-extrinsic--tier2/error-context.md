# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tier2/bridge.spec.ts >> Journey 2b — Bridge Outbound (Polkadot.js required) >> HFT-08 — submit outbound WETH bridge (hyperFungibleToken.send extrinsic)
- Location: tests/e2e/tier2/bridge.spec.ts:160:7

# Error details

```
Error: locator.click: Target page, context or browser has been closed
Call log:
  - waiting for getByRole('button', { name: 'Transfer' })

```

# Test source

```ts
  80  |     await page.getByRole("button", { name: "Transfer" }).click();
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
> 180 |     await page.getByRole("button", { name: "Transfer" }).click();
      |                                                          ^ Error: locator.click: Target page, context or browser has been closed
  181 | 
  182 |     // Confirm dialog — review fees, check terms, click Sign and Submit
  183 |     const termsCheck = page.getByRole("checkbox").first();
  184 |     if (await termsCheck.isVisible({ timeout: 3_000 }).catch(() => false)) {
  185 |       await termsCheck.check();
  186 |     }
  187 |     await page
  188 |       .getByRole("button", { name: /sign.*submit/i })
  189 |       .click({ timeout: 10_000 });
  190 | 
  191 |     signCue(
  192 |       "Sign the hyperFungibleToken.send extrinsic (assetId:3, destination: EVM-11155111)",
  193 |       "Polkadot.js / Talisman / SubWallet"
  194 |     );
  195 | 
  196 |     // Success: "These tokens will reflect in your Funding wallet in 2-3 mins"
  197 |     await expect(
  198 |       page.getByText(/reflect.*funding.*wallet|2-3.*min/i)
  199 |     ).toBeVisible({ timeout: SIGN_TIMEOUT });
  200 |   });
  201 | });
  202 | 
  203 | // ---------------------------------------------------------------------------
  204 | // HFT-16 — Exceeds balance (storageState, no signing)
  205 | // ---------------------------------------------------------------------------
  206 | 
  207 | test.describe("Bridge — validation with storageState (HFT-16, HFT-18, HFT-19)", () => {
  208 |   test.use({ storageState: FUNDED_STATE_PATH });
  209 | 
  210 |   test("HFT-16 — amount exceeds available balance shows validation error", async ({
  211 |     page,
  212 |   }) => {
  213 |     await suppressTestnetModal(page);
  214 |     await page.goto("/bridge");
  215 |     await expect(page.locator('input[name="amount"]')).toBeVisible({
  216 |       timeout: 15_000,
  217 |     });
  218 | 
  219 |     // Enter a very large amount that no testnet account could hold
  220 |     await page.locator('input[name="amount"]').fill("9999999");
  221 |     await page.locator('input[name="amount"]').blur();
  222 | 
  223 |     // ErrorMessages().CHECK_BALANCE = "The amount you entered exceeds your balance"
  224 |     await expect(
  225 |       visibleTooltip(page, "The amount you entered exceeds your balance")
  226 |     ).toBeVisible({ timeout: 5_000 });
  227 |     await expect(
  228 |       page.getByRole("button", { name: "Transfer" })
  229 |     ).toBeDisabled();
  230 |   });
  231 | 
  232 |   // ─── HFT-17 — Invalid EVM recipient ──────────────────────────────────────
  233 |   test.skip(
  234 |     // HFT-17 requires the outbound direction with a manually-typeable EVM recipient
  235 |     // field. The bridge form's destination account for outbound is controlled by
  236 |     // MetaMask (wagmi) — there is no free-text recipient input visible in the
  237 |     // current bridge form implementation.
  238 |     // Investigate whether the confirm dialog exposes a recipient override field.
  239 |     "HFT-17 — requires free-text EVM recipient input (investigation needed)"
  240 |   );
  241 | 
  242 |   // ─── HFT-18 — Missing NEXT_PUBLIC_BRIDGE_WETH_HFT_ADDRESS ────────────────
  243 |   test("HFT-18 — missing WETH HFT contract address shows error before submission", async ({
  244 |     page,
  245 |   }) => {
  246 |     // This test only fires the error if NEXT_PUBLIC_BRIDGE_WETH_HFT_ADDRESS is unset.
  247 |     // In a fully configured testnet env the error won't appear.
  248 |     // Run with the env var UNSET to exercise this path.
  249 |     await suppressTestnetModal(page);
  250 |     await page.goto("/bridge");
  251 |     await expect(
  252 |       page.getByRole("button", { name: "Transfer" })
  253 |     ).toBeVisible({ timeout: 15_000 });
  254 | 
  255 |     await page.locator('input[name="amount"]').fill("0.001");
  256 |     await page.getByRole("button", { name: "Transfer" }).click();
  257 | 
  258 |     // The confirm dialog should show an error instead of Sign and Submit
  259 |     await expect(
  260 |       page.getByText(/BRIDGE_WETH_HFT_ADDRESS.*not.*set|obtain.*WrappedHFT/i)
  261 |     ).toBeVisible({ timeout: 10_000 });
  262 | 
  263 |     // MetaMask popup must NOT appear
  264 |     await expect(
  265 |       page.getByRole("button", { name: /sign.*submit/i })
  266 |     ).not.toBeEnabled();
  267 |   });
  268 | 
  269 |   // ─── HFT-19 — hyperFungibleToken pallet not deployed ─────────────────────
  270 |   test("HFT-19 — outbound on node without HFT pallet shows extrinsic-not-found error", async ({
  271 |     page,
  272 |   }) => {
  273 |     // Only fires if the connected Polkadex node does NOT have the HFT pallet.
  274 |     // In production this error is triggered before the extension popup opens.
  275 |     await suppressTestnetModal(page);
  276 |     await page.goto("/bridge");
  277 |     await expect(
  278 |       page.getByRole("button", { name: "Transfer" })
  279 |     ).toBeVisible({ timeout: 15_000 });
  280 | 
```