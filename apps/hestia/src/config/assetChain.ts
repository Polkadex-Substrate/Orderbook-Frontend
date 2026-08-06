/**
 * Which chain an asset originates from, for the small grey label shown beside a
 * ticker.
 *
 * Replaces the bare `getChainFromTicker` in @orderbook/core, which was a
 * hardcoded switch covering only the original Substrate assets (PDEX, DOT, PHA,
 * GLMR...) and returned the literal string "Unknown" for everything else. After
 * the Hyperbridge integration that was eight of the nine tradeable assets -
 * WETH, wstETH, WBTC, LINK, UNI, AAVE, PWETH all read "Unknown" - and USDT was
 * worse than missing: the switch claimed "AssetHub" while on this network it is
 * bridged from Sepolia.
 *
 * Its own comment said "Should update it whenever any new asset is added", which
 * is the kind of instruction that does not survive contact with reality. So the
 * bridged assets are derived from config/bridge.ts instead, which already knows
 * every bridgeable token and the chains it exists on. A newly registered token
 * gets a correct label with no code change, and when the `/bridge/config`
 * endpoint in lib/hyperbridge/docs/api-driven-config-migration-plan.md lands,
 * the label follows from it for free.
 *
 * RETURNS UNDEFINED, NOT "Unknown".
 *
 * Every call site already had a fallback - `?? asset.name`, or `?? "Polkadex"`
 * in the trading header - and all of them were dead code, because a function
 * returning "Unknown" is never nullish. Returning undefined makes those
 * fallbacks work as originally intended: the trading header now says "Polkadex"
 * (true - that is where it trades) instead of "Unknown", and tables fall back to
 * the asset's own name.
 */
import { getChainFromTicker as legacyChainFromTicker } from "@orderbook/core/helpers";

import { BRIDGE_CHAINS, BRIDGE_TOKENS } from "./bridge";

/**
 * The foreign side of a bridged token.
 *
 * Identified structurally rather than by chain id: in BridgeTokenConfig.chains,
 * the entry carrying an `address` is an EVM contract (the origin), while the
 * Polkadex side carries an `assetId`. That keeps working if a second origin
 * chain is added, and does not hardcode "polkadex" as the local chain.
 */
const originChainOf = (ticker: string): string | undefined => {
  const token = Object.values(BRIDGE_TOKENS).find(
    (t) => t.ticker.toLowerCase() === ticker.toLowerCase()
  );
  if (!token) return undefined;

  const originEntry = Object.entries(token.chains).find(
    ([, spec]) => !!spec.address
  );
  if (!originEntry) return undefined;

  return BRIDGE_CHAINS[originEntry[0]]?.name;
};

export const getChainFromTicker = (
  ticker?: string | null
): string | undefined => {
  if (!ticker) return undefined;

  // Bridge config first. USDT exists in both sources and the bridge is right
  // for this deployment - the legacy switch's "AssetHub" is a leftover.
  const origin = originChainOf(ticker);
  if (origin) return origin;

  // Then the legacy map, for Substrate assets the bridge does not cover.
  // Its "Unknown" sentinel is normalised away so callers' fallbacks can fire.
  const legacy = legacyChainFromTicker(ticker);
  return legacy && legacy !== "Unknown" ? legacy : undefined;
};
