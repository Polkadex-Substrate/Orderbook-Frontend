// Re-export from the generic hook - useWethBalance is now an alias for
// useEvmTokenBalance with Sepolia/WETH defaults from config/bridge.ts.
export { useWethBalance } from "./useEvmTokenBalance";
