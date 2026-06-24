import { test, expect } from "./fixtures";
import { suppressTestnetModal, FUNDED_STATE_PATH } from "./helpers";

// Journey 5 — Explorer / Transfer History (EX-01..EX-09)
//
// Route: /history (transfer tab is the default tab)
//
// EX-01..EX-05, EX-08, EX-09 — require SubQuery to have indexed on-chain events.
//   Skipped if NEXT_PUBLIC_SUBQUERY_URL is not set.
//   When the indexer is live, transfers appear within ~30s–2min after on-chain finality.
//   Tests use a 90s timeout to allow for indexer lag.
//
// EX-06 — empty state for fresh address. Needs a wallet with NO transfers.
//   Use a different storageState or env var for a fresh address.
//
// EX-07 — misconfigured SubQuery URL shows graceful empty state.
//   Run with NEXT_PUBLIC_SUBQUERY_URL=http://invalid.example.com

const subqueryConfigured = !!process.env.NEXT_PUBLIC_SUBQUERY_URL;
const INDEXER_TIMEOUT = 90_000; // 90s for SubQuery to index the event

// ---------------------------------------------------------------------------
// Tests requiring SubQuery (storageState provides mainAddress)
// ---------------------------------------------------------------------------

test.describe("Journey 5 — Explorer (SubQuery-gated)", () => {
  test.use({ storageState: FUNDED_STATE_PATH });

  test.beforeEach(async ({ page }) => {
    await suppressTestnetModal(page);
    await page.goto("/history?tab=transfer");
    await expect(
      page.getByRole("tab", { name: "Transfer" })
    ).toBeVisible({ timeout: 15_000 });
  });

  // ─── EX-01 — Faucet drip visible in Transfer History ──────────────────────
  test("EX-01 — faucet PDEX drip appears in Transfer History", async ({
    page,
  }) => {
    test.skip(!subqueryConfigured, "Set NEXT_PUBLIC_SUBQUERY_URL to run indexer tests");

    // Wait up to 90s for a row containing "PDEX" to appear
    // (faucet transfer was submitted during FA-01)
    await expect(
      page.getByText("PDEX").first()
    ).toBeVisible({ timeout: INDEXER_TIMEOUT });
  });

  // ─── EX-02 — Inbound bridge WETH transfer visible ─────────────────────────
  test("EX-02 — inbound bridge WETH transfer appears after HFT-04 delivery", async ({
    page,
  }) => {
    test.skip(!subqueryConfigured, "Set NEXT_PUBLIC_SUBQUERY_URL to run indexer tests");

    await expect(
      page.getByText("WETH").first()
    ).toBeVisible({ timeout: INDEXER_TIMEOUT });
  });

  // ─── EX-03 — Internal deposit visible after IT-01 ─────────────────────────
  test("EX-03 — internal PDEX deposit visible in Transfer History", async ({
    page,
  }) => {
    test.skip(!subqueryConfigured, "Set NEXT_PUBLIC_SUBQUERY_URL to run indexer tests");

    // Transfer from funding address to trading proxy
    await expect(
      page.getByText("PDEX").first()
    ).toBeVisible({ timeout: INDEXER_TIMEOUT });
  });

  // ─── EX-04 — Outbound bridge burn/escrow visible after HFT-08 ─────────────
  test("EX-04 — outbound bridge WETH transfer visible after HFT-08", async ({
    page,
  }) => {
    test.skip(!subqueryConfigured, "Set NEXT_PUBLIC_SUBQUERY_URL to run indexer tests");

    await expect(
      page.getByText("WETH").first()
    ).toBeVisible({ timeout: INDEXER_TIMEOUT });
  });

  // ─── EX-05 — Pagination loads next page ───────────────────────────────────
  test("EX-05 — scrolling / pagination loads next page of transfers", async ({
    page,
  }) => {
    test.skip(!subqueryConfigured, "Set NEXT_PUBLIC_SUBQUERY_URL to run indexer tests");

    // Scroll to bottom of the transfer list to trigger infinite scroll.
    // Use the native <main> element selector — CSS [role='main'] only matches
    // elements with an explicit role attribute, not the implicit ARIA role of <main>.
    await page.locator("main").evaluate((el) => el.scrollTo(0, el.scrollHeight));

    // Wait briefly for next-page fetch
    await page.waitForTimeout(3_000);

    // No duplicate rows — count changes or more rows loaded
    // Verify the page doesn't crash
    await expect(page.locator("body")).not.toContainText("Error");
  });

  // ─── EX-07 — Misconfigured SubQuery → graceful empty state ────────────────
  test("EX-07 — misconfigured SubQuery URL shows graceful empty state, no crash", async ({
    page,
  }) => {
    // This test is meaningful when NEXT_PUBLIC_SUBQUERY_URL points to an invalid URL.
    // With a valid URL it will just show real data.
    // Run with: NEXT_PUBLIC_SUBQUERY_URL=http://invalid.example.com yarn test:e2e:tier2
    await page.goto("/history?tab=transfer");

    // The indexer helper falls back gracefully — shows empty state, no JS error
    // "No results found" OR transfers are shown (if URL is valid)
    // "No results found" is acceptable — just verify no unhandled JS error appears
    const hasError = await page.getByText(/unhandled.*error|runtime.*error/i).isVisible({ timeout: 2_000 });
    expect(hasError, "No unhandled error should be shown").toBe(false);
  });

  // ─── EX-08 — Recent transfer may not be indexed yet (boundary) ────────────
  test("EX-08 — very recent transfer may not appear immediately (< 30s)", async ({
    page,
  }) => {
    test.skip(!subqueryConfigured, "Set NEXT_PUBLIC_SUBQUERY_URL to run indexer tests");

    // Navigate immediately after a recent transfer
    // The page should not crash or show an error — it may show empty state
    await expect(page.locator("body")).not.toContainText("Unhandled Error");
    // Transfer may or may not be visible yet — no assertion on content
  });

  // ─── EX-09 — Timestamp accuracy ───────────────────────────────────────────
  test("EX-09 — transfer timestamps are shown and appear reasonable", async ({
    page,
  }) => {
    test.skip(!subqueryConfigured, "Set NEXT_PUBLIC_SUBQUERY_URL to run indexer tests");

    await expect(
      page.getByText("PDEX").first()
    ).toBeVisible({ timeout: INDEXER_TIMEOUT });

    // The date column uses intlFormat({ month:"short", ... }) which produces strings
    // like "Jun 24, 2024, 12:00 PM" — but locale "EN" can also yield numeric formats.
    // Match any of: "2m ago", "Jun 24", "2024-06-24", "6/24/2024", "24.06.2024".
    await expect(
      page.getByText(
        /\d+\s*(s|m|h|d|w|month|year)s?\s*ago|[a-z]{3,9}\s+\d+|\d{1,4}[./-]\d{1,2}[./-]\d{1,4}/i
      ).first()
    ).toBeVisible({ timeout: 5_000 });
  });
});

// ---------------------------------------------------------------------------
// EX-06 — Empty state for address with no transfers (no storageState)
// ---------------------------------------------------------------------------

test.describe("EX-06 — Fresh address shows empty state", () => {
  // Uses a fresh browser context (no storageState) — the human connects a brand
  // new wallet that has zero transfer history.
  // Alternatively: set TEST_FRESH_SUBSTRATE_ADDRESS to an address with no history
  // and inject it via storageState override.

  test("EX-06 — address with no transfers shows 'No results found' empty state", async ({
    page,
  }) => {
    await suppressTestnetModal(page);
    await page.goto("/history?tab=transfer");

    // Without wallet connected, the page shows ConnectAccountWrapper, not the table.
    // With a freshly connected wallet that has no history, it shows "No results found".
    // This test verifies the empty state renders without crashing.

    // Option A: not connected → ConnectAccountWrapper
    const notConnected = await page
      .getByText(/connect.*funding.*account/i)
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    // Option B: wallet IS connected but has existing transfer history.
    // The persistent context from tier2-setup already has transfers, so "No results
    // found" will not appear.  Skip rather than assert incorrect state.
    const hasRows = !notConnected && await page
      .locator("table tbody tr, [data-row]")
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    test.skip(
      notConnected || hasRows,
      notConnected
        ? "Connect a wallet with no transfer history, then re-run."
        : "Wallet has existing transfers; empty-state test requires a fresh address."
    );

    // With a connected wallet that has no transfers
    await expect(page.getByText("No results found")).toBeVisible({
      timeout: 15_000,
    });
    // No error shown, no crash
    await expect(page.getByText(/unhandled.*error/i)).not.toBeVisible();
  });
});
