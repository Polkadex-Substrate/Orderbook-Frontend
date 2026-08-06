// Returns chain name for an asset ticker
export const getChainFromTicker = (ticker: string): string => {
  // Should update it whenever any new asset is added to orderbook
  switch (ticker) {
    case "USDC":
    case "PINK":
    case "DED":
    case "USDT":
      return "AssetHub";
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
