import { test, expect } from "@playwright/test";
import { visibleTooltip } from "../helpers";

// HFT-13, HFT-14, HFT-15, HFT-21 — no wallet connection required.
//
// BridgeProvider initialises direction as "evm-to-substrate": Sepolia is always
// the source chain on page load, no chain-selection interaction needed.
// transferConfig.min.amount = 0.0001 is hardcoded in BridgeProvider (not chain-fetched).

test.describe("Bridge — wallet-disconnected UI states", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/bridge");
    await expect(
      page.getByRole("button", { name: "Transfer" })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("HFT-13 — EVM wallet not connected: account-not-present row visible, Transfer disabled", async ({
    page,
  }) => {
    // Default source = Sepolia (EVM), no MetaMask → EvmWalletRow renders disconnected state.
    // Scope to main to avoid the header's own "Connect wallet" button.
    await expect(page.getByText("Account not present")).toBeVisible();
    await expect(
      page.getByRole("main").getByRole("button", { name: "Connect wallet" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Transfer" })
    ).toBeDisabled();
  });

  test("HFT-14 — Polkadot account not selected: Transfer button disabled", async ({
    page,
  }) => {
    await expect(
      page.getByRole("button", { name: "Transfer" })
    ).toBeDisabled();
  });
});

test.describe("Bridge — amount field validation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/bridge");
    await expect(page.locator('input[name="amount"]')).toBeVisible({
      timeout: 15_000,
    });
  });

  test("HFT-15 — amount = 0 shows zero-amount error", async ({ page }) => {
    await page.locator('input[name="amount"]').fill("0");
    await page.locator('input[name="amount"]').blur();
    await expect(
      visibleTooltip(page, "The amount must be greater than 0")
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByRole("button", { name: "Transfer" })
    ).toBeDisabled();
  });

  test("HFT-21 — amount below minimum (0.0001) shows min-amount error", async ({
    page,
  }) => {
    // transferConfig.min.amount = 0.0001 (hardcoded literal in BridgeProvider.tsx)
    await page.locator('input[name="amount"]').fill("0.00001");
    await page.locator('input[name="amount"]').blur();
    await expect(
      visibleTooltip(page, /The amount cannot be less than/)
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByRole("button", { name: "Transfer" })
    ).toBeDisabled();
  });
});
