export const defaultConfig = {
  polkadexChain:
    process.env.POLKADEX_CHAIN ||
    "wss://polkadex.api.onfinality.io/ws?apikey=4e69b57b-0a14-45b8-8a86-3abf709a4ff5",
  gaTrackerKey: process.env.GA_MEASUREMENT_ID ?? "G-PWZK8JEFLX",
  landingPageMarket: process.env.LANDING_PAGE || "PDEXCUSDT",
  defaultTransferToken: process.env.DEFAULT_TRANSFER_TOKEN || "USDT",
  maintenanceMode: process.env.MAINTENACE_MODE === "true",
  availableRoutes: [
    "/trading",
    "/balances",
    "/wallets",
    "/transfer",
    "/cexOnRamp",
  ],
  underMaintenance: process.env.UNDER_MAINTENACE?.split(",") ?? [],
  blockedAssets: process.env.BLOCKED_ASSETS?.split(",") || [],
  subscanApi: process.env.SUBSCAN_API || "",
  defaultTheaSourceChain: process.env.DEFAULT_THEA_SOURCE_CHAIN ?? "Polkadot",
  defaultTheaDestinationChain:
    process.env.DEFAULT_THEA_DESTINATION_CHAIN ?? "Polkadex",
};
