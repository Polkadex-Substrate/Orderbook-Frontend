/**
 * Launching the tour from a page the tour does not live on.
 *
 * THE BUG THIS FIXES: "Open tour" did nothing (tester Bug #6, still open across
 * two retest rounds).
 *
 * The Balances page offered a card reading "Deposit, Withdrawal, and Transfer
 * differences - We'll guide you through these new processes on a quick tour",
 * with an "Open tour" button that was `disabled` and carried no `onClick`.
 * Clicking it could not do anything, and nothing explained why.
 *
 * WIRING IT UP IN PLACE WOULD HAVE BEEN WORSE. `useTour` lives in the trading
 * template and every step targets a trading-page element:
 *
 *     [data-tour="market-selector"]  [data-tour="orderbook"]
 *     [data-tour="price-chart"]      [data-tour="place-order"]
 *     [data-tour="orders-panel"]     [data-tour="recent-trades"]
 *
 * None of those exist on Balances. driver.js would have highlighted nothing and
 * pointed a popover at empty space - the same failure `waitForClearViewport`
 * was written to prevent.
 *
 * UX-LEARNINGS 5.8 gives the rule directly:
 *
 *     Not available yet              -> show it, explain what is coming
 *     Blocked on a prior step        -> show it enabled, make it PERFORM that step
 *     Cannot ever work here          -> remove it, do not disable it
 *
 * Being on the wrong page is a prior step. So the button navigates to the
 * trading page and asks it to start the tour, rather than sitting greyed out.
 *
 * Import-free and pure so the round trip is testable without a router.
 */

/**
 * Query flag the trading page watches for.
 *
 * A query parameter rather than sessionStorage on purpose: it survives a full
 * page load, it is visible in the URL when someone reports "the tour did not
 * start", and it cannot get stuck on - `shouldStartTour` is read once and the
 * caller strips it.
 */
export const TOUR_QUERY_PARAM = "tour";
const TOUR_QUERY_VALUE = "1";

/** Link target for a control that should open the tour from another page. */
export const tourLaunchHref = (marketPath: string): string => {
  const path = marketPath.startsWith("/") ? marketPath : `/${marketPath}`;
  // Preserve any query the caller already had rather than clobbering it.
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${TOUR_QUERY_PARAM}=${TOUR_QUERY_VALUE}`;
};

/**
 * Should the trading page start the tour on this load?
 *
 * Accepts the raw value so the caller can pass `useSearchParams().get(...)`
 * without this module importing next/navigation.
 */
export const shouldStartTour = (value: string | null | undefined): boolean =>
  value === TOUR_QUERY_VALUE;

/**
 * The URL to replace the current one with once the tour has been started.
 *
 * WHY STRIP IT. Left in place, a refresh or a shared link restarts the tour
 * every time, and Back walks the user through it again - the same trap that
 * `canonicalMarketPath` returning null was written to avoid for the market
 * redirect. Returns null when there is nothing to strip, so the caller has a
 * terminating condition that is a property of this function rather than a hope.
 */
export const strippedTourUrl = (url: string): string | null => {
  const [path, query = ""] = url.split("?");
  if (!query) return null;

  const kept = query
    .split("&")
    .filter((pair) => pair.split("=")[0] !== TOUR_QUERY_PARAM);

  if (kept.length === query.split("&").length) return null;
  return kept.length > 0 ? `${path}?${kept.join("&")}` : path;
};
