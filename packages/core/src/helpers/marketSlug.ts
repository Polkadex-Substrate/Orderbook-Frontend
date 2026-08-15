/**
 * Market identifiers in URLs.
 *
 * WHAT THIS CHANGES
 * A market is named `PDEX/USDT`, but a slash cannot appear in a path segment, so
 * the URL carried `PDEXUSDT` - the two tickers jammed together. Where one ticker
 * ends and the next begins is then a guess, and readers guess wrong:
 * `WETHUSDT`, `USDCUSDT`, `LINKUSDT`. The canonical form is now `PDEX-USDT`.
 *
 * THE MATCHING BUG THIS ALSO FIXES
 * `getCurrentMarket` used to resolve an id like this:
 *
 *     markets.find(v => v.name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
 *                        .includes(defaultMarket.toLowerCase()))
 *       ?? markets.find(v => v.id === defaultMarket)
 *       ?? markets[0];                                  // <- the problem
 *
 * Two defects in three lines. `includes` is a SUBSTRING test, so `PDEX` matched
 * `PDEX/USDT` and anything else starting the same way, first entry winning.
 * Worse, an id matching nothing fell through to `markets[0]`: a typo, a retired
 * pair, or a link from before a rename would silently load a DIFFERENT market
 * and let the user trade on it, with the URL still saying otherwise. On a
 * financial product that is the worst available failure mode, because it looks
 * like success.
 *
 * So matching here is exact, and a miss returns undefined. The caller decides
 * what to show, and the trading page shows a not-found state.
 *
 * Import-free: no wagmi, no React, no market service. The rules are pure string
 * handling and are tested as such.
 */

/** Separator in canonical URLs. A slash cannot appear inside a path segment. */
export const MARKET_SLUG_SEPARATOR = "-";

/** The parts of a market this module needs. Structural, so tests need no fixtures. */
export type MarketLike = {
  id: string;
  name: string;
};

/**
 * Comparison key for an identifier from any era.
 *
 * Everything that is not a letter or a digit is dropped and the rest is
 * uppercased, so all four spellings of one market collapse to one key:
 *
 *     "PDEX/USDT"  "PDEX-USDT"  "pdexusdt"  "PDEX_USDT"   ->  "PDEXUSDT"
 *
 * That is deliberately lossy. It is a key for equality only - never render it,
 * and never store it as an identifier.
 */
export const marketKey = (value: string): string =>
  (value ?? "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

/**
 * Canonical URL segment for a market: `PDEX-USDT`.
 *
 * Built from `name`, which the market service composes as
 * `${baseAsset.ticker}/${quoteAsset.ticker}`. Any separator already present is
 * normalised, so feeding this its own output is safe.
 */
export const marketSlug = (market: MarketLike): string =>
  (market?.name ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, MARKET_SLUG_SEPARATOR)
    .replace(/^-+|-+$/g, "");

/** Canonical path for a market. One definition, so links cannot drift apart. */
export const marketPath = (market: MarketLike): string =>
  `/trading/${marketSlug(market)}`;

/**
 * Find the market a URL segment refers to, or undefined.
 *
 * Three ways an identifier reaches us, tried in order of certainty:
 *
 *   1. The service id verbatim (`"123-231"`). Exact, so it is tried first and
 *      is never subjected to key normalisation, which would strip its hyphen
 *      and could collide with something else.
 *   2. The canonical slug, `PDEX-USDT`.
 *   3. A legacy or hand-typed spelling: `PDEXUSDT`, `pdex-usdt`, `PDEX/USDT`.
 *
 * There is no positional fallback. Not finding a market is a real answer.
 */
export const findMarketBySlug = <T extends MarketLike>(
  markets: readonly T[] | undefined | null,
  identifier: string | null | undefined
): T | undefined => {
  if (!markets?.length || !identifier) return undefined;

  const byId = markets.find((m) => m.id === identifier);
  if (byId) return byId;

  const key = marketKey(identifier);
  if (!key) return undefined;

  return markets.find((m) => marketKey(m.name) === key);
};

/**
 * Find a market to trade a single asset in: `/trading/PDEX`.
 *
 * THIS IS NOT THE OLD SUBSTRING RULE COMING BACK. The base ticker must match in
 * full. `PDEX` resolves; `PDE` and `USD` do not, where the old `includes` test
 * would have accepted both.
 *
 * It exists because the balances and open-orders tables have linked to
 * `/trading/<ticker>` all along - "trade this holding" - and that worked only
 * because the old matcher accepted a prefix. Removing the fuzziness without
 * replacing this specific case would have turned every Trade button on the
 * balances page into a not-found. So the accident becomes an intentional,
 * tested rule, and the trading page then rewrites the URL to the canonical pair.
 *
 * When an asset trades against several quotes the first market wins, which is
 * the market list's own order. Deterministic, and the user can switch.
 */
export const findMarketByBaseTicker = <T extends MarketLike>(
  markets: readonly T[] | undefined | null,
  ticker: string | null | undefined
): T | undefined => {
  if (!markets?.length || !ticker) return undefined;
  const key = marketKey(ticker);
  if (!key) return undefined;
  return markets.find((m) => marketKey((m.name ?? "").split("/")[0]) === key);
};

/**
 * Everything the trading route accepts, in order of specificity.
 *
 * A full pair first, in any spelling, then a lone base ticker. Nothing else, and
 * no positional fallback: an identifier that names no market resolves to
 * undefined and the page says so.
 */
export const resolveMarket = <T extends MarketLike>(
  markets: readonly T[] | undefined | null,
  identifier: string | null | undefined
): T | undefined =>
  findMarketBySlug(markets, identifier) ??
  findMarketByBaseTicker(markets, identifier);

/**
 * The path this URL should be rewritten to, or null if it is already right.
 *
 * Returning null for "no change needed" is the whole safety property. The
 * trading page navigates when this is non-null, so a function that returned a
 * path unconditionally would navigate on every render: the redirect loop that
 * took down the error boundary earlier this month. The test feeds this function
 * its own output and requires null, which is the property that makes a loop
 * impossible rather than merely unlikely.
 *
 * Null is also returned when the market is unknown. An unrecognised id must
 * reach the not-found state, not be redirected somewhere plausible.
 */
export const canonicalMarketPath = (
  identifier: string | null | undefined,
  market: MarketLike | undefined
): string | null => {
  if (!market || !identifier) return null;
  const slug = marketSlug(market);
  if (!slug || identifier === slug) return null;
  return `/trading/${slug}`;
};
