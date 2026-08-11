/**
 * Render an order's type or status without ever throwing.
 *
 * THE BUG THIS FIXES (ORDERBOOK-TESTNET-6, first seen 2026-08-11T06:51:03Z)
 *
 *     TypeError: Cannot read properties of undefined (reading 'toLowerCase')
 *     at cell   (a table cell renderer)
 *     url: https://testnet.polkadex.ee/trading/LINKUSDT
 *
 * Three cell renderers did `e.getValue().type.toLowerCase()` or
 * `status.toLowerCase()`. `Order.type` is declared as the non-optional union
 * `"LIMIT" | "MARKET"`, so on paper this cannot be undefined.
 *
 * It is undefined, because the value never went through a check. The websocket
 * mapper does:
 *
 *     type:   item.order_type as OrderType,
 *     status: item.status     as OrderStatus,
 *     market: market || ({} as MarketBase),
 *
 * `as` is an ASSERTION, not a conversion. It tells the compiler to stop asking
 * questions about a value that arrived over the network. So a payload missing
 * `order_type` produces an Order whose `type` is undefined, and every consumer
 * downstream is written against a type that promised otherwise.
 *
 * WHY A CRASH HERE IS EXPENSIVE
 * It is inside a table cell, so it takes out the whole Orders panel - the
 * user's open orders and history - rather than one row. And it lands on a user
 * who has just placed an order and is looking for confirmation, which is the
 * worst possible moment to show them nothing.
 *
 * THIS IS THE SECOND HALF OF A TWO-PART FIX. Rendering safely stops the panel
 * from breaking, but the real defect is the mapper minting invalid Orders. Both
 * are needed: normalise at the boundary so bad data never spreads, and render
 * defensively so a future gap degrades one label instead of a panel.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 * It does not invent a value. An order of unknown type shows a dash, not
 * "limit" - guessing would be worse than admitting ignorance on a screen
 * people use to decide what to trade.
 *
 * Import-free so it is testable without a renderer.
 */

/** Shown when a field is missing. A dash reads as "not known", not as a value. */
export const UNKNOWN_LABEL = "-";

/**
 * Lowercase a label that arrives as an uppercase enum, safely.
 *
 * The UI pairs this with `first-letter:uppercase` in CSS, so "LIMIT" becomes
 * "limit" becomes a displayed "Limit". That styling is why lowercasing happens
 * at all, and why an undefined value crashed rather than merely looking wrong.
 */
export const orderFieldLabel = (
  value: unknown,
  fallback: string = UNKNOWN_LABEL
): string => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed.toLowerCase() : fallback;
  }

  // A number is not expected but is renderable and harmless to show; anything
  // else - undefined, null, object, symbol - has no sensible label.
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return fallback;
};

/**
 * Did this field arrive unusable?
 *
 * Lets the caller report the gap instead of silently rendering a dash forever.
 * The same reasoning as toastTitle's isUnusableTitle: fixing the crash without
 * reporting the cause would hide the mapper bug that produced it.
 */
export const isUnusableOrderField = (value: unknown): boolean =>
  orderFieldLabel(value) === UNKNOWN_LABEL;

/**
 * A market's display name, which has the same problem for the same reason.
 *
 * The mapper falls back to `{} as MarketBase`, so `market.name` is undefined
 * whenever the market id is not in the loaded list - which happens on a market
 * added since the page loaded, or during the window before markets resolve.
 */
export const marketNameLabel = (
  market: { name?: string | null } | null | undefined
): string => {
  const name = market?.name;
  return typeof name === "string" && name.trim() ? name : UNKNOWN_LABEL;
};
