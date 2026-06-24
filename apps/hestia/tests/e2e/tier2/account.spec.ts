import { test, expect } from "./fixtures";
import { suppressTestnetModal, signCue, SIGN_TIMEOUT, anyToast } from "./helpers";

// Journey 0 — Account Setup (AC-02, AC-03, AC-05, AC-06, AC-07, AC-08)
//
// Popup type per case:
//   AC-02 — Polkadot.js / Talisman: approve-sites popup (not a signing popup)
//   AC-03 — same popup, but extension has no accounts
//   AC-05 — Polkadot.js extrinsic popup (ocex.registerMainAccount / addProxyAccount)
//   AC-06 — no popup (navigate to /balances and read)
//   AC-07 — skipped: requires a specifically underfunded account (hard to set up)
//   AC-08 — skipped: requires exact minimum PDEX balance

test.describe.serial("Journey 0 — Account Setup", () => {
  // ─── AC-02 — Connect extension wallet, address appears in header ───────────
  test("AC-02 — funding account appears in header after connecting extension", async ({
    page,
  }) => {
    await suppressTestnetModal(page);
    await page.goto("/");

    // Click the header Connect wallet button
    await page.getByRole("button", { name: "Connect wallet" }).first().click();

    signCue(
      "Approve the dapp connection in Polkadot.js / Talisman / SubWallet",
      "Polkadot.js / Talisman / SubWallet"
    );

    // After approval: header shows a truncated substrate address
    // The address is shown as a button in the header (account selector)
    await expect(
      page.getByRole("banner").getByRole("button", { name: /^5[A-Za-z0-9]{5}/ })
    ).toBeVisible({ timeout: SIGN_TIMEOUT });
  });

  // ─── AC-03 — Extension with no accounts shows "no accounts" UI ────────────
  test.skip(
    // AC-03 requires the extension to have no accounts imported — contradicts the
    // funded-test-account setup. Run this test with a fresh browser profile that
    // has the extension installed but no accounts added.
    "AC-03 — requires empty extension (no accounts imported)"
  );

  // ─── AC-05 — Create trading account (browser wallet type) ─────────────────
  test("AC-05 — create trading account from connected funding account", async ({
    page,
  }) => {
    await suppressTestnetModal(page);
    await page.goto("/");

    // Navigate to the account creation flow
    // The exact UI path: header → account avatar/icon → "Create Trading Account"
    // or via Connect Trading Account flow
    await page.getByRole("button", { name: /connect.*trading|create.*trading/i }).first().click();

    signCue(
      "Sign the ocex.registerMainAccount or addProxyAccount extrinsic to register the trading account",
      "Polkadot.js / Talisman / SubWallet"
    );

    // After signing: trading account appears in the UI
    // The profile shows both funding and trading addresses
    await expect(anyToast(page)).toBeVisible({ timeout: SIGN_TIMEOUT });
    // TODO: pin to exact success text after first run
  });

  // ─── AC-06 — Trading account balance shows on /balances ───────────────────
  test("AC-06 — trading account balance initialised after deposit", async ({
    page,
  }) => {
    await suppressTestnetModal(page);
    await page.goto("/balances");

    // The balances page shows columns for Funding and Trading accounts.
    // After AC-05 + FA-01 deposit, the Trading column for PDEX should show a value.
    // "Trading Account" heading or section is present
    await expect(
      page.getByText(/trading.*account|account.*trading/i).first()
    ).toBeVisible({ timeout: 15_000 });

    // PDEX row is present (any positive balance)
    await expect(page.getByText("PDEX").first()).toBeVisible();
  });

  // ─── AC-07 — Insufficient PDEX for proxy bond ─────────────────────────────
  test.skip(
    // AC-07 requires a mainAddress with balance below the proxy bond requirement.
    // This contradicts the funded test account. Test manually with a fresh, unfunded account.
    "AC-07 — requires underfunded account (PDEX < proxy bond requirement)"
  );

  // ─── AC-08 — Exact minimum PDEX for proxy bond ────────────────────────────
  test.skip(
    // AC-08 requires exactly the minimum bond amount. Hard to automate precisely.
    "AC-08 — requires account funded with exactly the minimum proxy bond"
  );
});
