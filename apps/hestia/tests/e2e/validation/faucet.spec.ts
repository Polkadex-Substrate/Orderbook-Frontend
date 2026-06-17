import { test, expect } from "@playwright/test";
import { suppressTestnetModal, visibleTooltip } from "../helpers";

// FA-06 to FA-09 — client-side Formik validation on the faucet form.
// No wallet connection required.

const ADDR_29 = "12345678901234567890123456789"; // 29 chars — below the 30-char minimum
const ADDR_30 = "123456789012345678901234567890"; // 30 chars — exactly at the minimum

test.describe("Faucet form validation", () => {
  test.beforeEach(async ({ page }) => {
    await suppressTestnetModal(page);
    await page.goto("/faucet");
    await expect(
      page.getByRole("button", { name: "Request Tokens" })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("FA-06 — submit button disabled when no token is selected", async ({
    page,
  }) => {
    await page.locator('input[name="walletAddress"]').fill(ADDR_30);
    await page.locator('input[name="walletAddress"]').blur();
    await expect(
      page.getByRole("button", { name: "Request Tokens" })
    ).toBeDisabled();
  });

  test("FA-07 — empty address field shows required error", async ({ page }) => {
    await page.locator('input[name="walletAddress"]').click();
    await page.locator('input[name="walletAddress"]').blur();
    await expect(
      visibleTooltip(page, "Wallet address is required")
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByRole("button", { name: "Request Tokens" })
    ).toBeDisabled();
  });

  test("FA-08 — address shorter than 30 chars shows validation error", async ({
    page,
  }) => {
    await page.locator('input[name="walletAddress"]').fill(ADDR_29);
    await page.locator('input[name="walletAddress"]').blur();
    await expect(
      visibleTooltip(page, "Enter a valid wallet address")
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByRole("button", { name: "Request Tokens" })
    ).toBeDisabled();
  });

  test("FA-09 — address exactly 30 chars passes client validation and enables submit", async ({
    page,
  }) => {
    // Token trigger is a <div asChild> chain — use text content, not getByRole("button")
    await page.getByText("Select token").click();
    await page.getByRole("menuitem", { name: /PDEX/ }).click();

    await page.locator('input[name="walletAddress"]').fill(ADDR_30);
    await page.locator('input[name="walletAddress"]').blur();

    // No visible tooltip error for the address field
    await expect(
      visibleTooltip(page, "Enter a valid wallet address")
    ).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Request Tokens" })
    ).toBeEnabled();
  });
});
