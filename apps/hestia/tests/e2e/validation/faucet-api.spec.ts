import { test, expect, Page } from "@playwright/test";
import { suppressTestnetModal } from "../helpers";

// FA-01..FA-05 — pure REST calls to NEXT_PUBLIC_FAUCET_URL/api/register + /api/drip.
// No wallet signing. Skipped if env vars are not configured.
//
// Required env vars:
//   NEXT_PUBLIC_FAUCET_URL   — base URL of the faucet API
//   NEXT_PUBLIC_FAUCET_API_KEY — API key (may be empty string if not required)
//   TEST_SUBSTRATE_ADDRESS   — a real testnet substrate address to drip to

const TEST_ADDRESS =
  process.env.TEST_SUBSTRATE_ADDRESS ?? "TODO:set TEST_SUBSTRATE_ADDRESS";

const configured =
  !!process.env.NEXT_PUBLIC_FAUCET_URL && !TEST_ADDRESS.startsWith("TODO:");

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

async function openFaucet(page: Page) {
  await suppressTestnetModal(page);
  await page.goto("/faucet");
  await expect(
    page.getByRole("button", { name: "Request Tokens" })
  ).toBeVisible({ timeout: 15_000 });
}

async function selectToken(page: Page, ticker: "PDEX" | "WETH" | "USDC" | "USDT") {
  await page.getByText("Select token").click();
  // Dropdown.Item renders as role="menuitem"; ticker is first word in item text
  await page.getByRole("menuitem", { name: new RegExp(`^${ticker}`) }).click();
}

async function fillAddress(page: Page) {
  await page.locator('input[name="walletAddress"]').fill(TEST_ADDRESS);
  await page.locator('input[name="walletAddress"]').blur();
}

async function submitAndExpectSuccess(page: Page) {
  await page.getByRole("button", { name: "Request Tokens" }).click();
  // faucetDrip success fires onHandleAlert("Tokens Sent!", `${amount} has been sent...`)
  // 60s: WETH drip can take longer than other tokens on testnet.
  await expect(page.getByText("Tokens Sent!")).toBeVisible({ timeout: 60_000 });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test.describe("Faucet — REST API (FA-01 to FA-05)", () => {
  test.skip(
    !configured,
    "Set NEXT_PUBLIC_FAUCET_URL and TEST_SUBSTRATE_ADDRESS to run faucet API tests"
  );

  test.beforeEach(async ({ page }) => {
    await openFaucet(page);
  });

  test("FA-01 — request PDEX tokens for valid address", async ({ page }) => {
    await selectToken(page, "PDEX");
    await fillAddress(page);
    await submitAndExpectSuccess(page);
  });

  test("FA-02 — request WETH tokens for valid address", async ({ page }) => {
    await selectToken(page, "WETH");
    await fillAddress(page);
    await submitAndExpectSuccess(page);
  });

  test("FA-03 — request USDC tokens for valid address", async ({ page }) => {
    await selectToken(page, "USDC");
    await fillAddress(page);
    await submitAndExpectSuccess(page);
  });

  test("FA-04 — request USDT tokens for valid address", async ({ page }) => {
    await selectToken(page, "USDT");
    await fillAddress(page);
    await submitAndExpectSuccess(page);
  });

  test("FA-05 — duplicate request within rate-limit window returns error", async ({
    page,
  }) => {
    // First request (may succeed or may already be limited from a prior run)
    await selectToken(page, "PDEX");
    await fillAddress(page);
    await page.getByRole("button", { name: "Request Tokens" }).click();
    // Dismiss any first-request toast and reset
    await page.waitForTimeout(2_000);

    // Second request — must hit the rate limit
    await page.goto("/faucet");
    await suppressTestnetModal(page);
    await expect(
      page.getByRole("button", { name: "Request Tokens" })
    ).toBeVisible({ timeout: 15_000 });
    await selectToken(page, "PDEX");
    await fillAddress(page);
    await page.getByRole("button", { name: "Request Tokens" }).click();
    // Error toast appears with a rate-limit or "already requested" message
    await expect(
      page.getByText(/limit|exceeded|already|too.*soon|rate/i).first()
    ).toBeVisible({ timeout: 30_000 });
    // Success toast must NOT be visible
    await expect(page.getByText("Tokens Sent!")).not.toBeVisible();
  });
});
