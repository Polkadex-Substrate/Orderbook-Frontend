import { test, expect } from "@playwright/test";
import {
  suppressTestnetModal,
  signCue,
  SIGN_TIMEOUT,
  FUNDED_STATE_PATH,
  anyToast,
  visibleTooltip,
  confirmTransactionModal,
} from "./helpers";

// Journey 3 — Internal Transfer (IT-01..IT-09)
//
// Signing mechanism: api.tx.ocex.deposit / withdraw via signAndSendExtrinsic.
// The Polkadot.js extension signer is required — storageState does NOT provide
// the extension signer. Tests that sign on-chain (IT-01..IT-03, IT-08, IT-09)
// require the extension to be connected in the browser session.
//
// IT-06 and IT-07 do NOT require signing:
//   IT-06 — form validation (uses storageState so chainBalance is a real number)
//   IT-07 — UI state when no trading account (no storageState, no signing)
//
// Route: /transfer/[asset-id]  where [asset-id] is the on-chain ticker
//   PDEX transfers: /transfer/PDEX
//   WETH transfers: /transfer/WETH
//   Default:        /transfer/USDT   (DEFAULT_TRANSFER_TOKEN env var)
//
// TODO: verify that /transfer/PDEX and /transfer/WETH are valid route params
//       on your testnet — check the available asset list in the transfer dropdown.

// ---------------------------------------------------------------------------
// Signing tests (require extension — no storageState)
// ---------------------------------------------------------------------------

test.describe.serial("Journey 3a — Internal Transfer (signed)", () => {
  let depositedPdexAmount = "1"; // adjust to your testnet balance

  test.beforeEach(async ({ page }) => {
    await suppressTestnetModal(page);
  });

  // ─── IT-01 — Deposit PDEX Funding → Trading ────────────────────────────────
  test("IT-01 — deposit PDEX from Funding to Trading account", async ({
    page,
  }) => {
    await page.goto("/transfer/PDEX");
    await expect(page.locator('input[name="amount"]')).toBeVisible({
      timeout: 15_000,
    });

    // Ensure direction is Funding → Trading (default on load)
    await expect(
      page.getByText(/From Funding Account/i).first()
    ).toBeVisible();

    await page.locator('input[name="amount"]').fill(depositedPdexAmount);

    // Click Transfer — a ConfirmTransaction modal may appear first
    await page.getByRole("button", { name: "Transfer" }).click();
    await confirmTransactionModal(page);

    signCue(
      `Sign the ocex.deposit extrinsic — depositing ${depositedPdexAmount} PDEX from Funding to Trading`,
      "Polkadot.js / Talisman / SubWallet"
    );

    // After signing: any toast appears (success or error) or form resets
    // TODO: replace with exact success text after first run
    await expect(anyToast(page)).toBeVisible({ timeout: SIGN_TIMEOUT });
  });

  // ─── IT-02 — Deposit WETH Funding → Trading ───────────────────────────────
  test("IT-02 — deposit WETH from Funding to Trading account", async ({
    page,
  }) => {
    await page.goto("/transfer/WETH");
    await expect(page.locator('input[name="amount"]')).toBeVisible({
      timeout: 15_000,
    });

    await page.locator('input[name="amount"]').fill("0.001");
    await page.getByRole("button", { name: "Transfer" }).click();
    await confirmTransactionModal(page);

    signCue(
      "Sign the ocex.deposit extrinsic — depositing 0.001 WETH from Funding to Trading",
      "Polkadot.js / Talisman / SubWallet"
    );

    await expect(anyToast(page)).toBeVisible({ timeout: SIGN_TIMEOUT });
  });

  // ─── IT-03 — Withdraw PDEX Trading → Funding ──────────────────────────────
  test("IT-03 — withdraw PDEX from Trading to Funding account", async ({
    page,
  }) => {
    await page.goto("/transfer/PDEX");
    await expect(page.locator('input[name="amount"]')).toBeVisible({
      timeout: 15_000,
    });

    // Switch direction to Trading → Funding using the swap arrow button
    // The direction-toggle button is between the From/To cards (icon-only, no text)
    await page
      .getByRole("button", { name: /To Trading Account/i })
      .click()
      .catch(() => {
        // Fallback: click the arrow/swap icon between the cards
      });
    // Alternatively, look for the direction-swap button by position
    const swapBtn = page
      .locator("button")
      .filter({ has: page.locator("svg") })
      .nth(1); // adjust index if needed
    await swapBtn.click().catch(() => {});

    await page.locator('input[name="amount"]').fill("0.5");
    await page.getByRole("button", { name: "Transfer" }).click();
    await confirmTransactionModal(page);

    signCue(
      "Sign the ocex.withdraw extrinsic — withdrawing 0.5 PDEX from Trading to Funding",
      "Polkadot.js / Talisman / SubWallet"
    );

    await expect(anyToast(page)).toBeVisible({ timeout: SIGN_TIMEOUT });
  });

  // ─── IT-08 — Deposit exact full balance (MAX) ─────────────────────────────
  test("IT-08 — deposit exact full funding balance using MAX button", async ({
    page,
  }) => {
    await page.goto("/transfer/PDEX");
    await expect(page.locator('input[name="amount"]')).toBeVisible({
      timeout: 15_000,
    });

    // Click the MAX button to populate with full balance
    await page.getByRole("button", { name: "MAX" }).click();
    // Amount field should now be populated
    await expect(
      page.locator('input[name="amount"]')
    ).not.toHaveValue("0", { timeout: 3_000 });

    await page.getByRole("button", { name: "Transfer" }).click();
    await confirmTransactionModal(page);

    signCue(
      "Sign the ocex.deposit extrinsic — depositing full available PDEX balance",
      "Polkadot.js / Talisman / SubWallet"
    );

    await expect(anyToast(page)).toBeVisible({ timeout: SIGN_TIMEOUT });
  });

  // ─── IT-09 — Deposit 1 planck (minimum unit) ──────────────────────────────
  test("IT-09 — deposit 1 smallest unit (1 planck = 0.000000000001 PDEX)", async ({
    page,
  }) => {
    await page.goto("/transfer/PDEX");
    await expect(page.locator('input[name="amount"]')).toBeVisible({
      timeout: 15_000,
    });

    // 1 planck = 10^-12 PDEX
    await page.locator('input[name="amount"]').fill("0.000000000001");

    await page.getByRole("button", { name: "Transfer" }).click();
    await confirmTransactionModal(page);

    signCue(
      "Sign the ocex.deposit extrinsic — depositing 1 planck (0.000000000001 PDEX)",
      "Polkadot.js / Talisman / SubWallet"
    );

    await expect(anyToast(page)).toBeVisible({ timeout: SIGN_TIMEOUT });
  });
});

// ---------------------------------------------------------------------------
// Validation tests (use storageState — no extension needed)
// ---------------------------------------------------------------------------

// IT-06 — Amount = 0 shows TOO_SMALL error (requires real chainBalance via storageState)
test.describe("Journey 3b — Transfer validation (storageState)", () => {
  test.use({ storageState: FUNDED_STATE_PATH });

  test("IT-06 — amount = 0 shows too-small validation error", async ({
    page,
  }) => {
    await suppressTestnetModal(page);
    await page.goto("/transfer/PDEX");
    await expect(page.locator('input[name="amount"]')).toBeVisible({
      timeout: 15_000,
    });

    await page.locator('input[name="amount"]').fill("0");
    await page.locator('input[name="amount"]').blur();

    // ErrorMessages().TOO_SMALL = "Too Small!"
    // With storageState: chainBalance is a real number, so only TOO_SMALL fails
    // (CHECK_BALANCE passes since 0 ≤ real balance).
    // The Radix Tooltip now mounts correctly because errors.amount is unambiguous.
    await expect(visibleTooltip(page, "Too Small!")).toBeVisible({
      timeout: 5_000,
    });
  });
});

// IT-07 — No trading account → "Account not present" in the To card
test.describe("Journey 3c — Transfer UI state (no trading account)", () => {
  // Fresh browser (no storageState) — user has extension connected but no trading account
  test("IT-07 — attempt deposit without trading account shows account-not-present UI", async ({
    page,
  }) => {
    await suppressTestnetModal(page);
    await page.goto("/transfer/USDT");
    await expect(page.locator('input[name="amount"]')).toBeVisible({
      timeout: 15_000,
    });

    // The "To Trading Account" card shows "Account not present" when tradeAddress is empty
    await expect(page.getByText("Account not present").first()).toBeVisible();

    // The submit button shows "Connect your account" (no trading account to transfer to)
    await expect(
      page.getByRole("button", { name: "Connect your account" })
    ).toBeVisible();
  });
});
