import {
  TOUR_QUERY_PARAM,
  shouldStartTour,
  strippedTourUrl,
  tourLaunchHref,
} from "./tourLaunch";

/*
 * Ground truth: "Open tour" on the Balances page did nothing. The button was
 * `disabled` with no onClick, and the tour it advertised only exists on the
 * trading page, where every step targets a trading-page element.
 */

describe("tourLaunchHref", () => {
  it("points at the trading page with the tour flag", () => {
    expect(tourLaunchHref("/trading/PDEX-USDT")).toBe(
      `/trading/PDEX-USDT?${TOUR_QUERY_PARAM}=1`
    );
  });

  it("normalises a path given without a leading slash", () => {
    expect(tourLaunchHref("trading/PDEX-USDT")).toContain(
      "/trading/PDEX-USDT?"
    );
  });

  it("appends rather than clobbering an existing query", () => {
    const href = tourLaunchHref("/trading/PDEX-USDT?ref=balances");
    expect(href).toContain("ref=balances");
    expect(href).toContain(`${TOUR_QUERY_PARAM}=1`);
    expect(href.match(/\?/g)).toHaveLength(1);
  });
});

describe("shouldStartTour", () => {
  it("starts only for the exact flag value", () => {
    expect(shouldStartTour("1")).toBe(true);
  });

  it("does not start for absent, empty or arbitrary values", () => {
    for (const value of [null, undefined, "", "0", "true", "yes", "2"]) {
      expect(shouldStartTour(value)).toBe(false);
    }
  });
});

describe("strippedTourUrl - the tour must not restart on every refresh", () => {
  it("removes the flag and keeps the path", () => {
    expect(strippedTourUrl(`/trading/PDEX-USDT?${TOUR_QUERY_PARAM}=1`)).toBe(
      "/trading/PDEX-USDT"
    );
  });

  it("keeps every other parameter", () => {
    expect(
      strippedTourUrl(`/trading/PDEX-USDT?a=1&${TOUR_QUERY_PARAM}=1&b=2`)
    ).toBe("/trading/PDEX-USDT?a=1&b=2");
  });

  it("returns null when there is nothing to strip, giving the caller a terminating condition", () => {
    // Feed it its own output. A second pass must be a no-op BY CONSTRUCTION,
    // not by luck - the same property canonicalMarketPath was given after an
    // automatic navigation in an effect produced an unresponsive page.
    const once = strippedTourUrl(`/trading/PDEX-USDT?${TOUR_QUERY_PARAM}=1`);
    expect(once).not.toBeNull();
    expect(strippedTourUrl(once as string)).toBeNull();
  });

  it("returns null for a URL with no query at all", () => {
    expect(strippedTourUrl("/trading/PDEX-USDT")).toBeNull();
  });

  it("returns null when a query exists but carries no tour flag", () => {
    expect(strippedTourUrl("/trading/PDEX-USDT?a=1")).toBeNull();
  });

  it("does not strip a parameter that merely starts with the same letters", () => {
    expect(strippedTourUrl("/trading/PDEX-USDT?tourism=1")).toBeNull();
  });
});
