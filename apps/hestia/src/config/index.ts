import { LANDING_PAGE_MARKET } from "@orderbook/core/config";

export const defaultConfig = {
  polkadexFeature: process.env.POLKADEX_FEATURE,
  // No mainnet default. This read `|| "wss://mainnet.polkadex.ee"`, so a
  // testnet build with POLKADEX_CHAIN missing - which is easy, since it is
  // baked at build time and an empty value does not fail the build - would
  // connect to Polkadex MAINNET and look like it was working. Empty is the
  // safer failure: the chain provider errors visibly instead of quietly
  // pointing the UI at real funds.
  polkadexChain: process.env.POLKADEX_CHAIN || "",
  gaTrackerKey: process.env.GA_MEASUREMENT_ID ?? "G-PWZK8JEFLX",
  // Imported, not redeclared. This used to be a copy with a comment saying it
  // "must stay identical" to packages/core, which is a convention with no check
  // - and the two had already drifted to "PDEXCUSDT" here and "DOTUSDT" there,
  // neither of which existed on the testnet. Now there is one definition.
  landingPageMarket: LANDING_PAGE_MARKET,
  defaultTransferToken: process.env.DEFAULT_TRANSFER_TOKEN || "USDT",
  withCredentials: false,
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
  signUpDisabled: process.env.SIGNUP_DISABLED === "true",
  reconnectRangerTime: 30000,
  showShutdownPopup: process.env.SHOW_SHUTDOWN_POPUP === "true",
  availableRoutes: [
    "/trading",
    "/balances",
    "/codeVerification",
    "/createAccount",
    "/deposit",
    "/recovery",
    "/resetPassword",
    "/resetPasswordForm",
    "/wallets",
    "/sign",
    "/signIn",
    "/withdraw",
    "/transfer",
    "/cexOnRamp",
  ],
  underMaintenance: process.env.UNDER_MAINTENACE?.split(",") ?? [],
  mainUrl: process.env.MAIN_URL || "/trading",
  blockedAssets: process.env.BLOCKED_ASSETS?.split(",") || [],
  subscanApi: process.env.SUBSCAN_API || "",
  subqueryUrl: process.env.NEXT_PUBLIC_SUBQUERY_URL || "",
  disabledFeatures: process.env.DISABLED_FEATURES?.split(","),
};
