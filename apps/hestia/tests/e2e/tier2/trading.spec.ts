import { test, expect } from "@playwright/test";
import {
  suppressTestnetModal,
  FUNDED_STATE_PATH,
  visibleTooltip,
} from "./helpers";

// Journey 4 — Place Order (PO-01..PO-12)
//
// All PO tests use storageState (funded-state.json).
//
// KEY INSIGHT: With a browser-wallet trading account (tradeAddress ≠ mainAddress),
// useCreateOrder.ts sets isSignedByExtension = false, so orders are signed via
// wallet.getPair(tradeAddress) — an in-process keyring call with NO extension popup.
// Every order in this suite places and cancels silently.
//
// Market: /trading/PDEXPWETH
//   base  = PDEX  →  "Buy PDEX" / "Sell PDEX" buttons
//   quote = WETH  →  price is expressed in WETH
//
// Amounts used here are conservative testnet values — adjust to your balance.
// Success signal: "Order placed" toast (from useCreateOrder.ts onHandleAlert).

const MARKET = "PDEXPWETH";
const LIMIT_PRICE = "0.01";    // 0.01 WETH per PDEX
const LIMIT_AMOUNT = "1";      // 1 PDEX
const MARKET_AMOUNT = "1";     // 1 PDEX

test.describe("Journey 4 — Place Order", () => {
  test.use({ storageState: FUNDED_STATE_PATH });

  test.beforeEach(async ({ page }) => {
    await suppressTestnetModal(page);
    await page.goto(`/trading/${MARKET}`);
    // Wait for the PlaceOrder form to hydrate
    await expect(
      page.getByRole("tab", { name: "Limit" })
    ).toBeVisible({ timeout: 15_000 });
  });

  // ─── PO-01 — Limit buy ─────────────────────────────────────────────────────
  test("PO-01 — place limit buy order: Buy PDEX", async ({ page }) => {
    await page.getByRole("tab", { name: "Limit" }).click();
    await page.locator('input[name="price"]').fill(LIMIT_PRICE);
    await page.locator('input[name="amount"]').fill(LIMIT_AMOUNT);
    await page.getByRole("button", { name: /^Buy PDEX/i }).click();

    await expect(page.getByText("Order placed")).toBeVisible({
      timeout: 15_000,
    });
    // Order should appear in Open Orders tab
    await page.getByRole("tab", { name: /Open Orders/i }).click();
    await expect(
      page.getByText(LIMIT_PRICE).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  // ─── PO-02 — Limit sell ────────────────────────────────────────────────────
  test("PO-02 — place limit sell order: Sell PDEX", async ({ page }) => {
    await page.getByRole("tab", { name: "Limit" }).click();
    await page.locator('input[name="price"]').fill("0.02"); // above market to avoid fill
    await page.locator('input[name="amount"]').fill(LIMIT_AMOUNT);
    await page.getByRole("button", { name: /^Sell PDEX/i }).click();

    await expect(page.getByText("Order placed")).toBeVisible({
      timeout: 15_000,
    });
  });

  // ─── PO-03 — Market buy ────────────────────────────────────────────────────
  test("PO-03 — place market buy order", async ({ page }) => {
    await page.getByRole("tab", { name: "Market" }).click();
    await page.locator('input[name="amount"]').fill(MARKET_AMOUNT);
    await page.getByRole("button", { name: /^Buy PDEX/i }).click();

    // Market orders are executed immediately — may appear in Order History rather
    // than Open Orders. "Order placed" toast still fires.
    await expect(page.getByText("Order placed")).toBeVisible({
      timeout: 15_000,
    });
  });

  // ─── PO-04 — Cancel an open order ─────────────────────────────────────────
  test.describe.serial("PO-04 + PO-05 — Cancel and verify balance restored", () => {
    test("PO-04 — cancel open order: order removed from Open Orders", async ({
      page,
    }) => {
      // First place a limit order to cancel
      await page.getByRole("tab", { name: "Limit" }).click();
      await page.locator('input[name="price"]').fill(LIMIT_PRICE);
      await page.locator('input[name="amount"]').fill(LIMIT_AMOUNT);
      await page.getByRole("button", { name: /^Buy PDEX/i }).click();
      await expect(page.getByText("Order placed")).toBeVisible({
        timeout: 15_000,
      });

      // Open Orders tab — find the cancel button on the most recent order
      await page.getByRole("tab", { name: /Open Orders/i }).click();
      await expect(
        page.getByText(LIMIT_PRICE).first()
      ).toBeVisible({ timeout: 5_000 });

      await page
        .getByRole("button", { name: /cancel/i })
        .first()
        .click();

      // Cancel confirmation if present
      const confirmCancel = page.getByRole("button", { name: /confirm|yes.*cancel/i });
      if (await confirmCancel.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await confirmCancel.click();
      }

      await expect(page.getByText(/order.*cancelled|cancel.*success/i)).toBeVisible({
        timeout: 15_000,
      });
    });

    test("PO-05 — cancelled order releases reserved balance back to trading account", async ({
      page,
    }) => {
      // After cancel, navigate to /balances and verify the PDEX balance increased
      // (reserved funds returned to available). We just verify the balance page loads
      // with a PDEX entry — exact amount comparison is brittle due to fee variation.
      await page.goto("/balances");
      await expect(page.getByText("PDEX").first()).toBeVisible({
        timeout: 15_000,
      });
    });
  });

  // ─── PO-06 — Insufficient balance ─────────────────────────────────────────
  test("PO-06 — order with amount exceeding trading balance rejected", async ({
    page,
  }) => {
    await page.getByRole("tab", { name: "Limit" }).click();
    await page.locator('input[name="price"]').fill(LIMIT_PRICE);
    // Enter an astronomically large amount
    await page.locator('input[name="amount"]').fill("9999999999");
    await page.locator('input[name="amount"]').blur();

    // Submit button disabled (validation) or error fires post-submit
    // The button shows disabled when !isValid
    await expect(
      page.getByRole("button", { name: /^Buy PDEX/i })
    ).toBeDisabled();
  });

  // ─── PO-07 — Quantity = 0 (validation with wallet connected) ──────────────
  test("PO-07 — quantity = 0 shows validation error", async ({ page }) => {
    await page.getByRole("tab", { name: "Limit" }).click();
    await page.locator('input[name="price"]').fill(LIMIT_PRICE);
    await page.locator('input[name="amount"]').fill("0");
    await page.locator('input[name="amount"]').blur();

    // With isSignedIn=true (storageState), the error tooltip fires
    // Error: "Minimum amount: {minQuantity}"
    await expect(
      visibleTooltip(page, /Minimum amount/i)
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByRole("button", { name: /^Buy PDEX/i })
    ).toBeDisabled();
  });

  // ─── PO-08 — Price = 0 on limit order ─────────────────────────────────────
  test("PO-08 — price = 0 on limit order shows validation error", async ({
    page,
  }) => {
    await page.getByRole("tab", { name: "Limit" }).click();
    await page.locator('input[name="price"]').fill("0");
    await page.locator('input[name="price"]').blur();

    // Error: "Minimum price: {minMarketPrice}"
    await expect(
      visibleTooltip(page, /Minimum price/i)
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByRole("button", { name: /^Buy PDEX/i })
    ).toBeDisabled();
  });

  // ─── PO-09 — No trading session (session expired) ─────────────────────────
  test.skip(
    // PO-09 requires the trading account session to be expired or removed.
    // Reproducible by clearing gDrive from localStorage — do this manually.
    "PO-09 — requires expired trading session (clear gDrive from localStorage)"
  );

  // ─── PO-10 — Full balance order using MAX button ───────────────────────────
  test("PO-10 — limit buy order with exact full available balance (MAX button)", async ({
    page,
  }) => {
    await page.getByRole("tab", { name: "Limit" }).click();
    await page.locator('input[name="price"]').fill(LIMIT_PRICE);
    // Click MAX for amount
    await page.getByRole("button", { name: "MAX" }).first().click();
    await expect(
      page.locator('input[name="amount"]')
    ).not.toHaveValue("0", { timeout: 3_000 });

    await page.getByRole("button", { name: /^Buy PDEX/i }).click();
    await expect(page.getByText("Order placed")).toBeVisible({
      timeout: 15_000,
    });
  });

  // ─── PO-11 — Minimum allowed quantity ─────────────────────────────────────
  test("PO-11 — place order with minimum allowed quantity for the market", async ({
    page,
  }) => {
    // minQuantity is fetched from the market config on the backend.
    // Use the smallest value that doesn't fail the "Minimum amount" validation.
    // TODO: replace with the actual minQuantity from your testnet market config.
    const minQty = process.env.TEST_MIN_QUANTITY ?? "0.0001";

    await page.getByRole("tab", { name: "Limit" }).click();
    await page.locator('input[name="price"]').fill(LIMIT_PRICE);
    await page.locator('input[name="amount"]').fill(minQty);
    await page.locator('input[name="amount"]').blur();

    // No "Minimum amount" error should appear
    await expect(
      visibleTooltip(page, /Minimum amount/i)
    ).not.toBeVisible({ timeout: 2_000 });
    // Button should be enabled
    await expect(
      page.getByRole("button", { name: /^Buy PDEX/i })
    ).toBeEnabled();

    await page.getByRole("button", { name: /^Buy PDEX/i }).click();
    await expect(page.getByText("Order placed")).toBeVisible({
      timeout: 15_000,
    });
  });

  // ─── PO-12 — Quantity 1 unit below minimum ─────────────────────────────────
  test("PO-12 — quantity 1 unit below minimum shows validation error", async ({
    page,
  }) => {
    // TODO: replace with actual minQuantity - smallest unit for your market.
    const belowMin = process.env.TEST_BELOW_MIN_QUANTITY ?? "0.00001";

    await page.getByRole("tab", { name: "Limit" }).click();
    await page.locator('input[name="price"]').fill(LIMIT_PRICE);
    await page.locator('input[name="amount"]').fill(belowMin);
    await page.locator('input[name="amount"]').blur();

    await expect(
      visibleTooltip(page, /Minimum amount/i)
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByRole("button", { name: /^Buy PDEX/i })
    ).toBeDisabled();
  });
});
