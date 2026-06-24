import { defineConfig, devices } from "@playwright/test";
import { config as loadDotenv } from "dotenv";
import path from "path";


// Load .env.local so non-NEXT_PUBLIC_ test vars (e.g. TEST_SUBSTRATE_ADDRESS)
// are available to the Playwright test process without needing shell exports.
loadDotenv({ path: path.resolve(__dirname, ".env.local"), override: false });

// libasound.so.2 may not be installed system-wide (e.g. Ubuntu 26.04 without apt access).
// Set PLAYWRIGHT_LD_LIBRARY_PATH to a directory containing libasound.so.2 to work around this.
// Example: export PLAYWRIGHT_LD_LIBRARY_PATH=$HOME/.local/lib
// CI machines with libasound installed system-wide can leave this unset.
if (process.env.PLAYWRIGHT_LD_LIBRARY_PATH) {
  process.env.LD_LIBRARY_PATH = [
    process.env.PLAYWRIGHT_LD_LIBRARY_PATH,
    process.env.LD_LIBRARY_PATH,
  ]
    .filter(Boolean)
    .join(":");
}

// The second webServer (port 3001, maintenance env vars) is expensive: it spawns a full
// Next.js dev process. Only start it when explicitly running the env-flags project.
// Set RUN_ENV_FLAG_TESTS=1 to opt in (see test:e2e:flags script in package.json).
const envFlagServer = process.env.RUN_ENV_FLAG_TESTS
  ? [
      {
        // NEXT_PUBLIC_ENABLE_FAUCET=false  → middleware redirects /faucet to /
        // NEXT_PUBLIC_IS_HYPERBRIDGE_MAINTENANCE=true → bridge renders maintenance screen
        command: "yarn dev",
        url: "http://localhost:3001",
        reuseExistingServer: true,
        timeout: 120_000,
        env: {
          PORT: "3001",
          NEXT_PUBLIC_ENABLE_FAUCET: "false",
          NEXT_PUBLIC_IS_HYPERBRIDGE_MAINTENANCE: "true",
        },
      },
    ]
  : [];

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Cap at 2 workers for Tier 1 headless tests (WSL RAM limit).
  // Tier 2 projects override this to 1 via their own config.
  // CI always runs at 1 worker.
  workers: process.env.CI ? 1 : (process.env.TIER2 ? 1 : 2),
  // Next.js dev mode compiles routes on first request — allow 90s per test
  // so cold-start compilation doesn't consume the entire budget before
  // assertions run.  CI uses a built server so 30s is sufficient there.
  timeout: process.env.CI ? 30_000 : 90_000,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    // Generous navigation timeout for dev-mode cold compilation.
    navigationTimeout: process.env.CI ? 30_000 : 60_000,
  },
  // ─── Project routing ───────────────────────────────────────────────────────
  //
  // chromium          — Tier 1 headless validation tests (default: yarn test:e2e)
  // chromium-env-flags— FA-10 + HFT-20 against port-3001 maintenance server
  //                     Run with: yarn test:e2e:flags  (sets RUN_ENV_FLAG_TESTS=1)
  //
  // tier2-setup       — One-time setup: creates tests/e2e/tier2/.auth/funded-state.json
  //                     Run with: yarn test:e2e:tier2:setup
  //
  // tier2             — Semi-automated Tier 2 tests (headed, serial, human signs)
  //                     Run with: yarn test:e2e:tier2
  //                     PO tests sign silently via browser-wallet keyring (no popup).
  //                     IT/HFT/AC tests require extension popups — human must be present.
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: [
        "**/validation/env-flags.spec.ts",
        "**/tier2/**",
      ],
    },
    {
      name: "chromium-env-flags",
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3001" },
      testMatch: ["**/validation/env-flags.spec.ts"],
    },
    {
      // One-time setup — run once before tier2 to create the funded storageState.
      // Extension loading + persistent profile are handled by tests/e2e/tier2/fixtures.ts.
      name: "tier2-setup",
      use: { ...devices["Desktop Chrome"] },
      testMatch: ["**/tier2/setup.spec.ts"],
      timeout: 600_000,          // 10 min — human does a lot of steps
      retries: 0,
    },
    {
      // Semi-automated Tier 2 tests — all run headed, serially, at 1 worker.
      // PO tests sign silently via browser-wallet keyring (no popup).
      // IT/HFT/AC/EX tests use signCue() to prompt the human for extension interaction.
      // Extension loading + persistent profile are handled by tests/e2e/tier2/fixtures.ts.
      name: "tier2",
      use: { ...devices["Desktop Chrome"], actionTimeout: 30_000 },
      testMatch: ["**/tier2/*.spec.ts"],
      testIgnore: ["**/tier2/setup.spec.ts"],
      timeout: 300_000,          // 5 min per test (generous for human signing)
      retries: 0,
    },
  ],
  webServer: [
    {
      command: "yarn dev",
      url: "http://localhost:3000",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    ...envFlagServer,
  ],
});
