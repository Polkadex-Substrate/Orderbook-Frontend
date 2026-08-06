/**
 * Origin chain for the XCM-bridged Substrate assets.
 *
 * DO NOT CALL THIS DIRECTLY from the app. Use
 * `apps/hestia/src/config/assetChain.ts`, which consults the Hyperbridge token
 * config first and normalises the "Unknown" sentinel below into `undefined` so
 * callers' fallbacks work. This function only knows about assets that predate
 * the Hyperbridge integration.
 *
 * AssetHub removed: USDC, USDT, PINK and DED mapped to it, and it is no longer
 * used. USDC and USDT are now bridged from Sepolia and resolve through the
 * bridge config - the "AssetHub" label was not merely stale for those two, it
 * was wrong. PINK and DED have no source now, so they fall through to the
 * caller's fallback (the asset's own name) rather than naming a chain that is
 * not involved.
 *
 * The remaining entries are kept for a future mainnet with those routes live.
 * Anything not listed returns "Unknown", which config/assetChain.ts converts to
 * undefined.
 */
export const getChainFromTicker = (ticker: string): string => {
  switch (ticker) {
    // Polkadex-wrapped WETH. Native to Polkadex, so it is deliberately NOT in
    // the Hyperbridge token config - the wrapper has no counterpart contract on
    // Sepolia. "Polkadex" is where it exists and where it trades; labelling it
    // "Sepolia Testnet" like the bridged WETH would be wrong.
    case "PWETH":
      return "Polkadex";
    case "ASTR":
      return "Astar";
    case "DOT":
      return "Polkadot";
    case "IBTC":
      return "Interlay";
    case "PHA":
      return "Phala";
    case "GLMR":
      return "Moonbeam";
    case "PDEX":
      return "Polkadex";
    case "UNQ":
      return "Unique";
    case "vDOT":
    case "BNC":
      return "Bifrost";
    default:
      return "Unknown";
  }
};
