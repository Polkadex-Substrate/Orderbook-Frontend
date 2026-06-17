import { test, expect } from "@playwright/test";

test("homepage loads with correct title", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Polkadex Orderbook/);
});
