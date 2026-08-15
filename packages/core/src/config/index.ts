import { Features } from "./types";

import { DefaultConfig } from ".";
export * from "./types";

/**
 * The market a visitor lands on with no market of their own.
 *
 * ONE definition, exported, because this constant has already rotted twice.
 * `apps/hestia` read `"PDEXCUSDT"` while this file read `"DOTUSDT"`, so with
 * LANDING_PAGE unset the app redirected to one pair while `getMarketUrl` built
 * links to another, and neither pair existed on the testnet. The repair at the
 * time was a comment in both files saying they "must stay identical", which is a
 * convention with nothing enforcing it - the same shape of mistake as the seven
 * copies of the amount regex. Hestia now imports this value instead of
 * redeclaring it, so the two cannot disagree.
 *
 * The fallback matches the deployed `LANDING_PAGE=PDEXUSDT`, confirmed on the
 * VPS 2026-08-14. It is still a hardcoded instance name and will rot again if
 * the pair is delisted. The real fix is to validate it against the loaded market
 * list at boot and fall back to the first available market, which needs the
 * market list at config time and is tracked as UX-LEARNINGS 1.8.
 */
export const LANDING_PAGE_MARKET = process.env.LANDING_PAGE || "PDEXUSDT";

export const defaultConfig: DefaultConfig = {
  polkadexFeature: process.env.POLKADEX_FEATURE,
  // Single endpoint, from the environment.
  //
  // Two hardcoded "backup chain" entries lived here:
  //   wss://polkadex.public.curie.radiumblock.co/ws
  //   wss://polkadex.api.onfinality.io/public-ws
  // Both are decommissioned and produced a steady stream of
  // "1006:: Abnormal Closure" in the console.
  //
  // They were worse than merely dead. @polkadot/api treats an array as a
  // rotation list and moves to the next entry on disconnect, and both of these
  // are MAINNET nodes - so on a testnet deployment a dropped testnet
  // connection would silently fail over to Polkadex mainnet. Different genesis
  // hash, different assets, and the UI would be talking to the wrong network
  // with no visible signal. A failed connection is much safer than a
  // successful connection to the wrong chain.
  //
  // Any real fallback must come from POLKADEX_CHAIN itself (comma-separated),
  // so it can never be a different network than the deployment intends.
  polkadexChain: (process.env.POLKADEX_CHAIN ?? "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean),
  gaTrackerKey: process.env.GA_MEASUREMENT_ID ?? "G-PWZK8JEFLX",
  // Must stay identical to apps/hestia/src/config/index.ts. This read
  // "DOTUSDT" while hestia read "PDEXCUSDT", so with LANDING_PAGE unset the app
  // redirected to one pair while getMarketUrl built links to another.
  landingPageMarket: LANDING_PAGE_MARKET,
  incrementalOrderBook: false,
  orderBookSideLimit: 25,
  defaultStorageLimit: 100,
  defaultTradingViewInterval: 5,
  sessionCheckInterval: 15000,
  balancesFetchInterval: 3000,
  minutesUntilAutoLogout: 120,
  alertDisplayTime: 5000,
  msPricesUpdates: 1000,
  maintenanceMode: process.env.MAINTENACE_MODE === "true",
  enableLmp: process.env.ENABLE_LMP === "true",
  isBridgeEnabled: process.env.IS_BRIDGE_ENABLED !== "false",
  availableRoutes: ["/trading", "/balances", "/transfer"],
  underMaintenance: process.env.UNDER_MAINTENACE?.split(",") ?? [],
  mainUrl: process.env.MAIN_URL || "/trading",
  blockedAssets: process.env.BLOCKED_ASSETS?.split(",") || [],
  subscanApi: process.env.SUBSCAN_API || "",
  subqueryUrl:
    process.env.SUBQUERY_URL ||
    "https://api.subquery.network/sq/Polkadex-Substrate/polkadex-mainnet",
  googleApiKey: process.env.GOOGLE_API_KEY ?? "",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  disabledFeatures: (process.env.DISABLED_FEATURES?.split(
    ","
  ) as Array<Features>) ?? ["payWithAnotherFee"],
};
