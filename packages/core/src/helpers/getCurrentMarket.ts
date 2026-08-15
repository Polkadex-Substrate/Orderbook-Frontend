import { Market } from "../utils/orderbookService/types";

import { resolveMarket } from "./marketSlug";

/**
 * Resolve a URL segment or stored identifier to a market.
 *
 * THIS USED TO END IN `?? markets[0]`, AND THAT WAS THE BUG.
 *
 *     const findMarketByName = markets?.find(v =>
 *       v.name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
 *         .includes(defaultMarket.toLowerCase()));
 *     const findMarketById = markets?.find(v => v.id === defaultMarket);
 *     return findMarketByName ?? findMarketById ?? markets[0];
 *
 * An identifier that matched nothing - a typo, a retired pair, a link from
 * before a rename, or from now on any URL whose format we changed - resolved to
 * whichever market happened to sort first. The page then rendered that market's
 * book, its prices and its order form while the address bar named a different
 * pair. Nothing failed, so nothing was reported.
 *
 * `includes` was the second defect: a substring test, so `PDEX` "matched"
 * `PDEX/USDT`, and a shorter ticker could match a longer pair's name.
 *
 * Matching now lives in marketSlug.ts, is exact, and returns undefined on a
 * miss. Callers already used `?.` on the result, so undefined propagates safely;
 * the trading page turns it into a visible not-found state.
 *
 * The signature is unchanged because eight call sites depend on it.
 */
export const getCurrentMarket = (
  markets: Market[],
  defaultMarket: string | null
): Market | undefined => resolveMarket(markets, defaultMarket);
