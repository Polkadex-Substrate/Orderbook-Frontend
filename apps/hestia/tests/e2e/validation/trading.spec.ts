import { test, expect } from "@playwright/test";
import { suppressTestnetModal } from "../helpers";

// AC-04 — order form behaviour without a connected wallet.
// No wallet connection required.
//
// The trading page renders "Connect Funding Account" in several places:
// the PlaceOrder form (Limit/buy.tsx, Limit/sell.tsx, Market/*), the Orders tabs,
// and the responsive interaction bar. The key gate assertion is that Buy/Sell submit
// buttons (named "Buy <ticker>" / "Sell <ticker>") are absent from the active
// order-entry form — ConnectAccount completely replaces the submit button when
// isSignedIn is false.
//
// Route: /trading/PDEXCUSDT — bare /trading permanentRedirects to
// /trading/${LANDING_PAGE} which defaults to "PDEXCUSDT".

test.describe("Trading — no-wallet state", () => {
  test.beforeEach(async ({ page }) => {
    await suppressTestnetModal(page);
    await page.goto("/trading/PDEXCUSDT");
    // Wait for the PlaceOrder form to hydrate (loads via dynamic import).
    // Any "Connect Funding Account" button confirms the form is in no-wallet state.
    await expect(
      page.getByRole("button", { name: "Connect Funding Account" }).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("AC-04 — no wallet: order-entry form gated by connect-account prompt, Buy/Sell absent", async ({
    page,
  }) => {
    // "Connect Funding Account" is visible (any instance confirms no-wallet state)
    await expect(
      page.getByRole("button", { name: "Connect Funding Account" }).first()
    ).toBeVisible();

    // The definitive gate assertion: Buy/Sell submit buttons do not exist anywhere
    // on the page. ConnectAccount fully replaces the submit button in the order form.
    await expect(
      page.getByRole("button", { name: /^Buy / })
    ).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: /^Sell / })
    ).not.toBeVisible();
  });
});
