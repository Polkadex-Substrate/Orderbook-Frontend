/**
 * Read the ticker stats out of a getMarketTickers response, and say which of
 * the three possible outcomes actually happened.
 *
 * WHY THIS EXISTS
 * `getTicker` did `toNullableNumber(tickerItem?.o)` on each field, where
 * `tickerItem` was `result.data.getMarketTickers.items`. That expression yields
 * null for THREE different situations, and the UI renders all three as `0`:
 *
 *   1. The market genuinely had no trades in the 24h window. Zero is honest.
 *   2. The response came back in a shape this code did not expect - most
 *      plausibly `items` as an ARRAY. The generated API.ts types say TickersConnection.items
 *      is a single object, but those types were generated against the RETIRED
 *      AppSync schema; the Rust GraphQL server replaced it, and this repo has
 *      already been bitten once by assuming the old envelope survived (the
 *      place_order reply turned out to be an opaque string, not the Lambda
 *      `{is_success, body}` JSON). Every sibling connection in the schema -
 *      markets, balances, orders - uses `Array<...>`; tickers is the lone
 *      exception, which is exactly the shape of a schema drift.
 *   3. The field was absent because the query errored softly.
 *
 * Only case 1 should display as a zero. The other two are failures, and this
 * project's standing rule is that a failed read must never be indistinguishable
 * from an empty one.
 *
 * Import-free so the rule is unit-testable without a GraphQL client.
 */

export type RawTickerStats = {
  o?: string | number | null;
  c?: string | number | null;
  h?: string | number | null;
  l?: string | number | null;
  vb?: string | number | null;
  vq?: string | number | null;
};

export type TickerStatsResult =
  | { status: "ok"; stats: RawTickerStats }
  | { status: "empty"; stats: null }
  | { status: "unreadable"; stats: null; reason: string };

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

/** Does this look like a stats record rather than some other object? */
const looksLikeStats = (v: unknown): v is RawTickerStats =>
  isObject(v) && ["o", "c", "h", "l", "vb", "vq"].some((k) => k in v);

/**
 * Normalise `getMarketTickers.items` into a single stats record.
 *
 * Accepts BOTH the object form the generated types promise and the array form
 * every other connection in the schema uses, because being tolerant here costs
 * nothing and being wrong costs a silently zeroed ticker strip across the whole
 * app. An array with more than one entry takes the first: the query is already
 * scoped to one market and one window.
 */
export const readTickerStats = (items: unknown): TickerStatsResult => {
  if (items === null || items === undefined) {
    // The server answered and had nothing for this window. Genuinely empty.
    return { status: "empty", stats: null };
  }

  if (Array.isArray(items)) {
    const first = items.find((entry) => looksLikeStats(entry));
    if (first) return { status: "ok", stats: first as RawTickerStats };
    if (items.length === 0) return { status: "empty", stats: null };
    return {
      status: "unreadable",
      stats: null,
      reason: `getMarketTickers.items was an array of ${items.length} entries, none carrying ticker fields (o/c/h/l/vb/vq)`,
    };
  }

  if (looksLikeStats(items)) return { status: "ok", stats: items };

  return {
    status: "unreadable",
    stats: null,
    reason: `getMarketTickers.items was ${
      isObject(items)
        ? `an object with keys [${Object.keys(items).join(", ")}]`
        : typeof items
    }, which carries no ticker fields`,
  };
};

/**
 * 24h change as a percentage, without the two ways this arithmetic goes wrong.
 *
 * The original was `((close - open) / open) * 100` guarded only by an isNaN
 * check. That covers `0/0`, but NOT a market whose window opens at zero and
 * closes above it: `5 / 0` is Infinity, isNaN(Infinity) is false, and the UI
 * renders "Infinity%". It also silently produced a number when either side was
 * null, because `Number(null)` is 0.
 *
 * Returns null when the change is genuinely unknowable, so callers can show
 * "-" rather than a fabricated 0%.
 */
export const percentChange = (
  open: number | null | undefined,
  close: number | null | undefined
): number | null => {
  if (open === null || open === undefined) return null;
  if (close === null || close === undefined) return null;
  if (!Number.isFinite(open) || !Number.isFinite(close)) return null;
  // A window that opened at zero has no baseline to be a percentage of.
  if (open === 0) return null;

  const change = ((close - open) / open) * 100;
  return Number.isFinite(change) ? change : null;
};
