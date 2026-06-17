import { test, expect } from "@playwright/test";

// FA-10, HFT-20 — tests that require specific NEXT_PUBLIC_* env vars.
//
// These run against the second webServer (port 3001), configured in playwright.config.ts
// under the "chromium-env-flags" project with:
//   NEXT_PUBLIC_ENABLE_FAUCET=false
//   NEXT_PUBLIC_IS_HYPERBRIDGE_MAINTENANCE=true
//
// The baseURL for this project is http://localhost:3001 (set in playwright.config.ts).
// Run only this project: yarn test:e2e --project=chromium-env-flags

test("FA-10 — /faucet redirects to / when NEXT_PUBLIC_ENABLE_FAUCET is false", async ({
  page,
}) => {
  await page.goto("/faucet");
  // Middleware redirects /faucet → / when the env var is not "true"
  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("button", { name: "Request Tokens" })
  ).not.toBeVisible({ timeout: 5_000 });
});

test("HFT-20 — bridge shows maintenance screen when NEXT_PUBLIC_IS_HYPERBRIDGE_MAINTENANCE is true", async ({
  page,
}) => {
  await page.goto("/bridge");
  // template.tsx replaces the form with a maintenance div when the env var = "true"
  await expect(page.getByText("Bridge Under Maintenance")).toBeVisible({
    timeout: 15_000,
  });
  await expect(
    page.getByRole("button", { name: "Transfer" })
  ).not.toBeVisible();
});
