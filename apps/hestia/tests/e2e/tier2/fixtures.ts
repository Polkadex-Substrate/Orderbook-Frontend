import { test as base, chromium, type BrowserContext } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const POLKADOT_EXT_ID = "mopnmbcafieddcagagdcbnhejhlodfdd";
const ENKRYPT_EXT_ID  = "kkpllkodjeloidieedojogacfhpaihoh";

// User's default Chrome profile directory (macOS path)
const CHROME_DEFAULT = path.join(
  os.homedir(),
  "Library/Application Support/Google/Chrome/Default"
);

// Resolve the highest installed version of a Chrome extension by ID.
function resolveExtPath(extId: string): string {
  try {
    const extRoot = path.join(CHROME_DEFAULT, "Extensions", extId);
    const versions = fs
      .readdirSync(extRoot)
      .filter((d) => d.endsWith("_0"))
      .sort();
    return versions.length ? path.join(extRoot, versions[versions.length - 1]) : "";
  } catch {
    return "";
  }
}

const POLKADOT_EXT = resolveExtPath(POLKADOT_EXT_ID);
const ENKRYPT_EXT  = resolveExtPath(ENKRYPT_EXT_ID);

// Persistent Chrome profile for Tier 2 — stores extension state across runs.
// gitignored (contains private key material).
export const CHROME_PROFILE_DIR = path.resolve(__dirname, "../.chrome-profile");

// Generic helper — copy a directory from src to dest if the dest log file is
// smaller than `minSizeBytes` (indicating a blank/unsynced profile).
function syncDirOnce(src: string, dest: string, minSizeBytes = 10_000): void {
  if (!fs.existsSync(src)) return;

  // Find the largest *.log file in src as the size signal
  let srcSize = 0;
  try {
    for (const f of fs.readdirSync(src)) {
      if (f.endsWith(".log") || f.endsWith(".ldb")) {
        srcSize = Math.max(srcSize, fs.statSync(path.join(src, f)).size);
      }
    }
  } catch { /* ignore */ }

  if (srcSize < 100) return; // source is empty — nothing to copy

  // Check dest — skip if already has meaningful data
  let destSize = 0;
  try {
    for (const f of fs.readdirSync(dest)) {
      if (f.endsWith(".log") || f.endsWith(".ldb")) {
        destSize = Math.max(destSize, fs.statSync(path.join(dest, f)).size);
      }
    }
  } catch { /* dest doesn't exist yet */ }

  if (destSize >= minSizeBytes) return; // already seeded

  if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true });
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}

// Sync all relevant storage directories for a wallet extension from the user's
// Chrome profile into the test profile.
function syncWalletStorage(extId: string, label: string): void {
  const pairs: Array<[string, string]> = [
    // chrome.storage.local (LevelDB)
    [
      path.join(CHROME_DEFAULT, "Local Extension Settings", extId),
      path.join(CHROME_PROFILE_DIR, "Default", "Local Extension Settings", extId),
    ],
    // IndexedDB LevelDB (main wallet data — Enkrypt uses this)
    [
      path.join(CHROME_DEFAULT, "IndexedDB", `chrome-extension_${extId}_0.indexeddb.leveldb`),
      path.join(CHROME_PROFILE_DIR, "Default", "IndexedDB", `chrome-extension_${extId}_0.indexeddb.leveldb`),
    ],
    // IndexedDB blobs
    [
      path.join(CHROME_DEFAULT, "IndexedDB", `chrome-extension_${extId}_0.indexeddb.blob`),
      path.join(CHROME_PROFILE_DIR, "Default", "IndexedDB", `chrome-extension_${extId}_0.indexeddb.blob`),
    ],
  ];

  let seeded = false;
  for (const [src, dest] of pairs) {
    const before = fs.existsSync(dest);
    syncDirOnce(src, dest);
    if (!before && fs.existsSync(dest)) seeded = true;
  }
  if (seeded) console.log(`[tier2/fixtures] ✓ ${label} wallet storage seeded.`);
}

// Build --disable-extensions-except and --load-extension args from whatever
// wallet extensions are installed on this machine.
function buildExtArgs(): string[] {
  const exts = [POLKADOT_EXT, ENKRYPT_EXT].filter(Boolean);
  if (!exts.length) return [];
  return [
    `--disable-extensions-except=${exts.join(",")}`,
    ...exts.map((e) => `--load-extension=${e}`),
  ];
}

// Override the built-in context fixture with launchPersistentContext so that:
//   • Polkadot.js and Enkrypt extensions load with the user's existing accounts
//   • Wallet accounts and app state persist between runs
//
// Tests run serially (workers: 1), so each test safely opens/closes the same
// profile directory — Chromium releases the lock when context.close() is called.
export const test = base.extend<{ context: BrowserContext }>({
  context: async ({}, use) => {
    syncWalletStorage(POLKADOT_EXT_ID, "Polkadot.js");
    syncWalletStorage(ENKRYPT_EXT_ID,  "Enkrypt");

    const context = await chromium.launchPersistentContext(CHROME_PROFILE_DIR, {
      headless: false,
      args: buildExtArgs(),
    });
    await use(context);
    await context.close();
  },
  // page is NOT overridden — Playwright's built-in page fixture calls
  // context.newPage() on our overridden context, which is the correct behaviour.
});

export const expect = test.expect;
