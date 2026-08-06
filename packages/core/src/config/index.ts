import { Features } from "./types";

import { DefaultConfig } from ".";
export * from "./types";

export const defaultConfig: DefaultConfig = {
  polkadexFeature: process.env.POLKADEX_FEATURE,
  polkadexChain: [
    process.env.POLKADEX_CHAIN as string,
    // This is a backup chain
    "wss://polkadex.public.curie.radiumblock.co/ws",
    "wss://polkadex.api.onfinality.io/public-ws",
  ],
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
  disabledTheaChains: process.env.DISABLED_THEA_CHAINS?.split(",") ?? [
    "0x25a5cc106eea7138acab33231d7160d69cb777ee0c2c553fcddf5138993e6dd9",
  ],
  subqueryUrl:
    process.env.SUBQUERY_URL ||
    "https://api.subquery.network/sq/Polkadex-Substrate/polkadex-mainnet",
  googleApiKey: process.env.GOOGLE_API_KEY ?? "",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  disabledFeatures: (process.env.DISABLED_FEATURES?.split(
    ","
  ) as Array<Features>) ?? ["payWithAnotherFee"],
  defaultTheaSourceChain: process.env.DEFAULT_THEA_SOURCE_CHAIN ?? "Polkadot",
  defaultTheaDestinationChain:
    process.env.DEFAULT_THEA_DESTINATION_CHAIN ?? "Polkadex",
};
