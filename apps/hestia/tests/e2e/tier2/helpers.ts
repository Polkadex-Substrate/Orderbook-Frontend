import { Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** How long to wait for a human to approve an extension/MetaMask popup. */
export const SIGN_TIMEOUT = 150_000; // 2.5 minutes

/** Path where the one-time funded-state storageState file is saved.
 *  Run `yarn test:e2e:tier2:setup` once to create it. */
export const FUNDED_STATE_PATH =
  "tests/e2e/tier2/.auth/funded-state.json";

// ---------------------------------------------------------------------------
// Sign cue
// ---------------------------------------------------------------------------

type WalletType =
  | "Polkadot.js / Talisman / SubWallet"
  | "MetaMask (approve ERC-20)"
  | "MetaMask (send tx)"
  | "MetaMask (connect)";

/**
 * Prints a visible prompt in the test runner terminal telling the human
 * which wallet to interact with and what action to take.
 *
 * Call this immediately before the expect() that waits for the result.
 * Never use page.pause() — the test auto-proceeds once the UI reacts.
 */
export function signCue(action: string, wallet: WalletType): void {
  const sep = "─".repeat(64);
  process.stdout.write(
    `\n${sep}\n` +
    `  👉  ACTION REQUIRED  ›  ${wallet}\n` +
    `      ${action}\n` +
    `      Timeout: ${SIGN_TIMEOUT / 1000}s — test auto-proceeds on UI change\n` +
    `${sep}\n\n`
  );
}

// ---------------------------------------------------------------------------
// Shared page helpers (re-exported from root helpers where needed)
// ---------------------------------------------------------------------------

/** Suppress the TestnetModal focus-trap before navigating to any page. */
export async function suppressTestnetModal(page: Page): Promise<void> {
  await page.addInitScript(() => {
    sessionStorage.setItem("testnet-notice-acknowledged", "1");
  });
}

/** Locate the visible Radix tooltip content (second of two duplicates). */
export function visibleTooltip(page: Page, text: string | RegExp) {
  return page
    .locator("[data-radix-popper-content-wrapper]")
    .getByText(text)
    .last();
}

// ---------------------------------------------------------------------------
// Sonner toast helpers
// ---------------------------------------------------------------------------

/** Wait for any Sonner toast to appear (success or error). */
export function anyToast(page: Page) {
  return page.locator("[data-sonner-toast]").first();
}

/** Wait for a Sonner success toast (data-type="success"). */
export function successToast(page: Page) {
  return page.locator("[data-sonner-toast][data-type='success']").first();
}

/** Wait for a Sonner error toast (data-type="error"). */
export function errorToast(page: Page) {
  return page.locator("[data-sonner-toast][data-type='error']").first();
}

// ---------------------------------------------------------------------------
// Transfer confirm modal
// ---------------------------------------------------------------------------

/**
 * After clicking "Transfer" in the internal transfer form, a ConfirmTransaction
 * modal may appear showing fee details before the extrinsic is submitted.
 * Click through it if present; otherwise this is a no-op.
 *
 * TODO: confirm exact button text after first run — "Sign and Submit" is assumed
 * from the same pattern used in the bridge confirm dialog.
 */
export async function confirmTransactionModal(page: Page): Promise<void> {
  const btn = page.getByRole("button", { name: /sign.*submit|confirm.*transfer|proceed/i });
  if (await btn.isVisible({ timeout: 4_000 }).catch(() => false)) {
    await btn.click();
  }
}
