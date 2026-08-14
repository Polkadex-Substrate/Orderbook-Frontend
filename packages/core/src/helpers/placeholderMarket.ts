/**
 * A structurally complete stand-in for a market that could not be resolved.
 *
 * THE BUG THIS FIXES (ORDERBOOK-TESTNET-6, second manifestation)
 *
 *   TypeError: undefined is not an object (evaluating 's.baseAsset.ticker')
 *   at cell   (a table cell renderer)
 *   Mobile Safari, iOS 18.3, /trading/PDEXUSDT
 *
 * The websocket mapper does:
 *
 *     market: market || ({} as MarketBase)
 *
 * `{} as MarketBase` is a LIE told to the compiler. The object has no
 * `baseAsset` and no `quoteAsset`, so every `market.baseAsset.ticker` in the
 * Orders panel throws - and there are 22 of those across columns.tsx and
 * responsiveTable.tsx for OpenOrders, OrderHistory and TradeHistory.
 *
 * WHY THIS FILE RATHER THAN 22 GUARDS
 * The first fix for this issue (orderFieldLabels) made the RENDERERS safe for
 * `type`, `status` and `market.name`. Sentry then regrouped the same crash under
 * the same issue id, one property along, because the underlying object was still
 * malformed. Guarding call sites is whack-a-mole: the object is wrong, so fix the
 * object. One placeholder, built once, satisfies every current and future access.
 *
 * WHY A PLACEHOLDER AND NOT DROPPING THE ORDER
 * The order is real - the user placed it, and it has a price, quantity and side
 * worth showing. Only the market METADATA is missing, which happens when an order
 * arrives for a market not in the loaded list: a market added since page load, or
 * an update racing the market list. Hiding a real order is worse than showing it
 * with an unknown pair.
 *
 * WHY THE TICKERS ARE DASHES
 * Same rule as everywhere else in this codebase: say what is known. A dash reads
 * as "not known". Inventing "PDEX" would put a specific wrong pair next to a real
 * quantity on a screen people trade from.
 *
 * Import-free so it is testable without a renderer.
 */

/** Shown wherever a ticker or name is genuinely unknown. */
export const UNKNOWN_TICKER = "-";

type PlaceholderAsset = {
  id: string;
  ticker: string;
  name: string;
  decimal: number;
};

export type PlaceholderMarket = {
  id: string;
  name: string;
  baseAsset: PlaceholderAsset;
  quoteAsset: PlaceholderAsset;
};

const unknownAsset = (): PlaceholderAsset => ({
  id: "",
  ticker: UNKNOWN_TICKER,
  name: UNKNOWN_TICKER,
  // 0, not 12: a placeholder must never be used to scale a real amount. If some
  // code path multiplies by this, the result is 1x rather than a silent 10^12
  // error - and a visibly unscaled number is far easier to notice than a
  // plausible-looking wrong one.
  decimal: 0,
});

/**
 * Build a market object that is safe to read from at any depth.
 *
 * @param id The market id from the payload, when there is one. Preserved so the
 *           row can still be correlated with chain data and so support can tell
 *           WHICH market failed to resolve, rather than seeing an anonymous dash.
 */
export const placeholderMarket = (id?: string | null): PlaceholderMarket => ({
  id: typeof id === "string" && id.trim() ? id.trim() : "",
  name: UNKNOWN_TICKER,
  baseAsset: unknownAsset(),
  quoteAsset: unknownAsset(),
});

/**
 * Is this market a placeholder rather than resolved metadata?
 *
 * Lets a caller report the gap instead of rendering dashes forever. Same
 * reasoning as isUnusableTitle and isUnusableOrderField: making the crash stop
 * without making the CAUSE visible just converts a loud failure into a quiet
 * wrong value.
 */
export const isPlaceholderMarket = (
  market: { baseAsset?: { ticker?: string } | null } | null | undefined
): boolean => market?.baseAsset?.ticker === UNKNOWN_TICKER;
