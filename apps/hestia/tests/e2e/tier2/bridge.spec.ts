import { test, expect } from "./fixtures";
import {
  suppressTestnetModal,
  signCue,
  SIGN_TIMEOUT,
  FUNDED_STATE_PATH,
  anyToast,
  visibleTooltip,
} from "./helpers";

// Journey 2 — Bridge (HFT-01, HFT-02, HFT-03, HFT-07, HFT-08, HFT-16..HFT-19)
//
// Popup types:
//   HFT-01 — MetaMask (connect): web3modal opens MetaMask or WalletConnect
//   HFT-02 — MetaMask x2: ERC-20 approval + send tx (isWeth=false path)
//   HFT-03 — MetaMask x1: send tx only (isWeth=true path, no ERC-20 approval)
//   HFT-07 — no popup (button click only)
//   HFT-08 — Polkadot.js extrinsic popup (hyperFungibleToken.send)
//   HFT-16 — no popup (validation with storageState)
//   HFT-17 — skip (recipient field investigation needed)
//   HFT-18 — no popup (error fires before tx — storageState for EVM source)
//   HFT-19 — no popup (error fires before tx — storageState for outbound)

// ---------------------------------------------------------------------------
// Inbound bridge (Sepolia → Polkadex) — requires MetaMask
// ---------------------------------------------------------------------------

test.describe.serial("Journey 2a — Bridge Inbound (MetaMask required)", () => {
  test.beforeEach(async ({ page }) => {
    await suppressTestnetModal(page);
    await page.goto("/bridge");
    await expect(
      page.getByRole("button", { name: "Transfer" })
    ).toBeVisible({ timeout: 15_000 });
  });

  // ─── HFT-01 — Connect MetaMask + Polkadot.js account ───────────────────────
  test("HFT-01 — connect MetaMask (EVM source) and Polkadot.js account (substrate destination)", async ({
    page,
  }) => {
    // The fixture loads Polkadot.js via --disable-extensions-except, which disables
    // MetaMask.  Skip this test when MetaMask is unavailable (no EVM wallet button).
    const hasEvmConnect = await page
      .getByRole("main")
      .getByRole("button", { name: "Connect wallet" })
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    test.skip(!hasEvmConnect, "MetaMask not available — EVM wallet button not found");

    // EVM side: click "Connect wallet" in the source row
    await page
      .getByRole("main")
      .getByRole("button", { name: "Connect wallet" })
      .click();

    signCue(
      "Approve the MetaMask (or WalletConnect) connection in the popup",
      "MetaMask (connect)"
    );

    // After MetaMask connected: EVM address shown (replaces "Account not present")
    await expect(
      page.getByText("Account not present")
    ).not.toBeVisible({ timeout: SIGN_TIMEOUT });

    // Substrate side: select an account from the AccountCombobox dropdown
    // (no popup needed — extension accounts are already enumerated)
    // The AccountCombobox shows a select/combobox for choosing the destination
    await expect(
      page.getByRole("button", { name: "Transfer" })
    ).toBeVisible();
  });

  // ─── HFT-02 — Bridge WETH inbound (isWeth=false: ERC-20 approval + send) ────
  test("HFT-02 — bridge WETH inbound: ERC-20 approval then send (isWeth=false path)", async ({
    page,
  }) => {
    // Amount field is auto-filled or the user types in it
    await page.locator('input[name="amount"]').fill("0.001");
    await page.getByRole("button", { name: "Transfer" }).click();

    // Confirm dialog appears — click Sign and Submit
    await page
      .getByRole("button", { name: /sign.*submit/i })
      .click({ timeout: 10_000 });

    signCue(
      "Step 1 of 2: Approve WETH ERC-20 spend to the WrappedHFT contract",
      "MetaMask (approve ERC-20)"
    );

    // Wait for the approval tx to be accepted (MetaMask closes, dialog proceeds)
    await page.waitForTimeout(5_000);

    signCue(
      "Step 2 of 2: Confirm the send tx (msg.value = quote() fee in ETH)",
      "MetaMask (send tx)"
    );

    // After both MetaMask confirmations: success toast or tx hash shown
    await expect(anyToast(page)).toBeVisible({ timeout: SIGN_TIMEOUT });
  });

  // ─── HFT-03 — Bridge WETH inbound (isWeth=true: single ETH send, no approval) ─
  test("HFT-03 — bridge WETH inbound: single ETH send, no ERC-20 approval (isWeth=true path)", async ({
    page,
  }) => {
    // Only valid if the deployed WrappedHFT contract has isWeth=true
    // If your testnet contract has isWeth=false, this test will show an approval step
    await page.locator('input[name="amount"]').fill("0.001");
    await page.getByRole("button", { name: "Transfer" }).click();
    await page
      .getByRole("button", { name: /sign.*submit/i })
      .click({ timeout: 10_000 });

    signCue(
      "Confirm the single send tx (msg.value = amount + quote() in ETH, no prior approval)",
      "MetaMask (send tx)"
    );

    await expect(anyToast(page)).toBeVisible({ timeout: SIGN_TIMEOUT });
  });
});

// ---------------------------------------------------------------------------
// HFT-07 — Swap direction (no popup)
// ---------------------------------------------------------------------------

test("HFT-07 — swap bridge direction: Sepolia→Polkadex becomes Polkadex→Sepolia", async ({
  page,
}) => {
  await suppressTestnetModal(page);
  await page.goto("/bridge");
  await expect(
    page.getByRole("button", { name: "Transfer" })
  ).toBeVisible({ timeout: 15_000 });

  // Default: EVM (Sepolia) is source. Swap arrow is between the chain rows.
  // TODO: confirm exact selector for the swap/arrow button
  // It is typically an icon button between the source and destination cards
  const swapBtn = page
    .locator("button")
    .filter({ has: page.locator('[class*="arrow"], [class*="swap"], svg') })
    .first();
  await swapBtn.click();

  // After swap: Polkadex is now the source, Sepolia is destination
  // "Account not present" for EVM side should now be on the DESTINATION row
  // and the source row should show the Polkadex account (or prompt to connect)
  await expect(page.getByText("Account not present").first()).toBeVisible({
    timeout: 5_000,
  });
});

// ---------------------------------------------------------------------------
// HFT-08 — Outbound bridge (Polkadex → Sepolia) — requires Polkadot.js extension
// ---------------------------------------------------------------------------

test.describe("Journey 2b — Bridge Outbound (Polkadot.js required)", () => {
  test("HFT-08 — submit outbound WETH bridge (hyperFungibleToken.send extrinsic)", async ({
    page,
  }) => {
    await suppressTestnetModal(page);
    await page.goto("/bridge");
    await expect(
      page.getByRole("button", { name: "Transfer" })
    ).toBeVisible({ timeout: 15_000 });

    // Swap to outbound direction (Polkadex → Sepolia) using the same selector
    // that HFT-07 uses successfully.  The plain svg filter picks up too many
    // unrelated icon buttons — arrow/swap class names narrow it down correctly.
    const swapBtn = page
      .locator("button")
      .filter({ has: page.locator('[class*="arrow"], [class*="swap"], svg') })
      .first();
    await swapBtn.click();

    // Enter amount
    await page.locator('input[name="amount"]').fill("0.001");
    await page.getByRole("button", { name: "Transfer" }).click();

    // Confirm dialog — review fees, check terms, click Sign and Submit
    const termsCheck = page.getByRole("checkbox").first();
    if (await termsCheck.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await termsCheck.check();
    }
    await page
      .getByRole("button", { name: /sign.*submit/i })
      .click({ timeout: 10_000 });

    signCue(
      "Sign the hyperFungibleToken.send extrinsic (assetId:3, destination: EVM-11155111)",
      "Polkadot.js / Talisman / SubWallet"
    );

    // Success: "These tokens will reflect in your Funding wallet in 2-3 mins"
    await expect(
      page.getByText(/reflect.*funding.*wallet|2-3.*min/i)
    ).toBeVisible({ timeout: SIGN_TIMEOUT });
  });
});

// ---------------------------------------------------------------------------
// HFT-16 — Exceeds balance (storageState, no signing)
// ---------------------------------------------------------------------------

test.describe("Bridge — validation with storageState (HFT-16, HFT-18, HFT-19)", () => {
  test.use({ storageState: FUNDED_STATE_PATH });

  test("HFT-16 — amount exceeds available balance shows validation error", async ({
    page,
  }) => {
    await suppressTestnetModal(page);
    await page.goto("/bridge");
    await expect(page.locator('input[name="amount"]')).toBeVisible({
      timeout: 15_000,
    });

    // Enter a very large amount that no testnet account could hold
    await page.locator('input[name="amount"]').fill("9999999");
    await page.locator('input[name="amount"]').blur();

    // ErrorMessages().CHECK_BALANCE = "The amount you entered exceeds your balance"
    await expect(
      visibleTooltip(page, "The amount you entered exceeds your balance")
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByRole("button", { name: "Transfer" })
    ).toBeDisabled();
  });

  // ─── HFT-17 — Invalid EVM recipient ──────────────────────────────────────
  test.skip(
    // HFT-17 requires the outbound direction with a manually-typeable EVM recipient
    // field. The bridge form's destination account for outbound is controlled by
    // MetaMask (wagmi) — there is no free-text recipient input visible in the
    // current bridge form implementation.
    // Investigate whether the confirm dialog exposes a recipient override field.
    "HFT-17 — requires free-text EVM recipient input (investigation needed)"
  );

  // ─── HFT-18 — Missing NEXT_PUBLIC_BRIDGE_WETH_HFT_ADDRESS ────────────────
  test("HFT-18 — missing WETH HFT contract address shows error before submission", async ({
    page,
  }) => {
    // This test only fires the error if NEXT_PUBLIC_BRIDGE_WETH_HFT_ADDRESS is unset.
    // In a fully configured testnet env the error won't appear.
    // Run with the env var UNSET to exercise this path.
    await suppressTestnetModal(page);
    await page.goto("/bridge");
    await expect(
      page.getByRole("button", { name: "Transfer" })
    ).toBeVisible({ timeout: 15_000 });

    await page.locator('input[name="amount"]').fill("0.001");
    await page.getByRole("button", { name: "Transfer" }).click();

    // The confirm dialog should show an error instead of Sign and Submit
    await expect(
      page.getByText(/BRIDGE_WETH_HFT_ADDRESS.*not.*set|obtain.*WrappedHFT/i)
    ).toBeVisible({ timeout: 10_000 });

    // MetaMask popup must NOT appear
    await expect(
      page.getByRole("button", { name: /sign.*submit/i })
    ).not.toBeEnabled();
  });

  // ─── HFT-19 — hyperFungibleToken pallet not deployed ─────────────────────
  test("HFT-19 — outbound on node without HFT pallet shows extrinsic-not-found error", async ({
    page,
  }) => {
    // Only fires if the connected Polkadex node does NOT have the HFT pallet.
    // In production this error is triggered before the extension popup opens.
    await suppressTestnetModal(page);
    await page.goto("/bridge");
    await expect(
      page.getByRole("button", { name: "Transfer" })
    ).toBeVisible({ timeout: 15_000 });

    // Swap to outbound
    const swapBtn = page.locator("button").filter({ has: page.locator("svg") }).first();
    await swapBtn.click();

    await page.locator('input[name="amount"]').fill("0.001");
    await page.getByRole("button", { name: "Transfer" }).click();

    // Error fires when the extrinsic builder checks api.tx.hyperFungibleToken?.send
    await expect(
      page.getByText(/hyperFungibleToken.*send.*not.*found|HFT.*pallet/i)
    ).toBeVisible({ timeout: 10_000 });
  });
});
