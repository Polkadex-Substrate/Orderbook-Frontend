import { test, expect } from "./fixtures";
import { suppressTestnetModal, FUNDED_STATE_PATH } from "./helpers";
import * as path from "path";
import * as fs from "fs";

// ---------------------------------------------------------------------------
// One-time setup — run with: yarn test:e2e:tier2:setup
// ---------------------------------------------------------------------------
//
// This script creates tests/e2e/tier2/.auth/funded-state.json which the PO
// and EX tests restore to skip the full AC-05 → IT-01 setup chain on every run.
//
// What the storageState captures (domain: localhost:3000):
//   localStorage["PROFILE/ACTIVE_ACCOUNT"]  → { mainAddress, tradeAddress }
//   localStorage["gDrive"]                  → browser-wallet trading keyring JSON
//   sessionStorage["testnet-notice-acknowledged"] → "1" (modal suppressed)
//
// Prerequisites before running this script:
//   1. Polkadot.js / Talisman extension installed and funded with PDEX
//   2. App dev server running (yarn dev or reuseExistingServer picks it up)
//   3. Faucet accessible (NEXT_PUBLIC_ENABLE_FAUCET=true) to drip tokens
//
// The script will:
//   Step 1 — Guide you to connect your extension wallet
//   Step 2 — Guide you to create a BROWSER WALLET trading account (not extension proxy)
//   Step 3 — Guide you to deposit PDEX + WETH to the trading account
//   Step 4 — Verify the funded state and save storageState

test("Create funded state for PO / EX tests", async ({ page, context }) => {
  // Ensure the .auth directory exists
  const authDir = path.dirname(FUNDED_STATE_PATH);
  fs.mkdirSync(authDir, { recursive: true });

  await suppressTestnetModal(page);
  await page.goto("/");

  // ─── Step 1: Connect extension wallet ────────────────────────────────────
  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║  SETUP  Step 1: Connect your Polkadot.js / Talisman wallet           ║
║                                                                      ║
║  1. Click "Connect wallet" in the top-right header                   ║
║  2. Approve the dapp connection in your extension                    ║
║  3. Select your testnet funding account                              ║
║                                                                      ║
║  Waiting up to 3 minutes for mainAddress to appear...               ║
╚══════════════════════════════════════════════════════════════════════╝
`);

  // Wait until mainAddress lands in localStorage (extension connection done)
  await page.waitForFunction(
    () => {
      try {
        const raw = localStorage.getItem("PROFILE/ACTIVE_ACCOUNT");
        if (!raw) return false;
        const { mainAddress } = JSON.parse(raw);
        return typeof mainAddress === "string" && mainAddress.length > 20;
      } catch {
        return false;
      }
    },
    { timeout: 180_000 }
  );
  console.log("  ✓ Extension wallet connected");

  // ─── Step 2: Create a browser-wallet trading account ─────────────────────
  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║  SETUP  Step 2: Create a BROWSER WALLET trading account             ║
║                                                                      ║
║  IMPORTANT: Choose "Browser Wallet" (not "Extension Proxy") mode.   ║
║  This lets PO tests sign orders silently (no popup per order).      ║
║                                                                      ║
║  1. Open the account/profile area                                    ║
║  2. Click "Create Trading Account"                                   ║
║  3. Choose Browser Wallet type and set any password                  ║
║  4. Approve the proxy-registration extrinsic in your extension       ║
║                                                                      ║
║  Waiting up to 5 minutes for tradeAddress ≠ mainAddress...          ║
╚══════════════════════════════════════════════════════════════════════╝
`);

  await page.waitForFunction(
    () => {
      try {
        const raw = localStorage.getItem("PROFILE/ACTIVE_ACCOUNT");
        if (!raw) return false;
        const { mainAddress, tradeAddress } = JSON.parse(raw);
        return (
          typeof tradeAddress === "string" &&
          tradeAddress.length > 20 &&
          tradeAddress !== mainAddress // browser wallet = different address
        );
      } catch {
        return false;
      }
    },
    { timeout: 300_000 }
  );
  console.log("  ✓ Browser-wallet trading account created");

  // ─── Step 3: Deposit PDEX and WETH to trading account ────────────────────
  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║  SETUP  Step 3: Deposit PDEX and WETH to the trading account        ║
║                                                                      ║
║  Navigate to /transfer and deposit:                                  ║
║    • At least 10 PDEX  (for PO-01..PO-12)                           ║
║    • At least 0.01 WETH (for WETH-side PO tests)                    ║
║                                                                      ║
║  Sign each deposit extrinsic in your extension when prompted.       ║
║                                                                      ║
║  When done, navigate to /balances so the balance is visible.        ║
║  Waiting up to 10 minutes for /balances to load with your address…  ║
╚══════════════════════════════════════════════════════════════════════╝
`);

  // Wait until user has navigated to /balances (confirms deposits visible)
  await page.waitForURL(/\/balances/, { timeout: 600_000 });
  // Brief settle for balance data to load from chain
  await page.waitForTimeout(3_000);
  console.log("  ✓ On /balances — deposits should be reflected");

  // ─── Step 4: Save storageState ────────────────────────────────────────────
  await context.storageState({ path: FUNDED_STATE_PATH });
  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║  ✅  State saved to: ${FUNDED_STATE_PATH.padEnd(46)}║
║                                                                      ║
║  You can now run:  yarn test:e2e:tier2                               ║
║  PO tests will sign orders silently using the browser wallet.        ║
╚══════════════════════════════════════════════════════════════════════╝
`);

  // Verify the saved state has both addresses
  const saved = JSON.parse(fs.readFileSync(FUNDED_STATE_PATH, "utf-8"));
  const activeAccount = saved.origins
    ?.find((o: { origin: string }) => o.origin.includes("localhost"))
    ?.localStorage?.find((e: { name: string }) => e.name === "PROFILE/ACTIVE_ACCOUNT");

  expect(activeAccount, "PROFILE/ACTIVE_ACCOUNT must be in saved state").toBeTruthy();
  const { mainAddress, tradeAddress } = JSON.parse(activeAccount.value);
  expect(mainAddress, "mainAddress must be set").toBeTruthy();
  expect(tradeAddress, "tradeAddress must be set").toBeTruthy();
  expect(tradeAddress, "tradeAddress must differ from mainAddress (browser wallet)").not.toBe(
    mainAddress
  );
});
