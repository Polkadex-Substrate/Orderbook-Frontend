import { Features } from "./types";

import { DefaultConfig } from ".";
export * from "./types";

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
  landingPageMarket: process.env.LANDING_PAGE || "DOTUSDT",
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
