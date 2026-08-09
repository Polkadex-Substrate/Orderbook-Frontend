/**
 * Turn a wire timestamp into a Date that cannot poison a render.
 *
 * SENTRY POLKADEX-ORDERBOOK-FE-TEST-B: "RangeError: Invalid time value",
 * thrown from a table cell on /trading/PDEXUSDT.
 *
 * `Intl.DateTimeFormat.format()` THROWS on an Invalid Date - it does not
 * return "Invalid Date" the way `String(date)` does. So one bad timestamp in
 * one row takes down the whole table, and the row that produced it is the one
 * piece of information the user does not get.
 *
 * THE ASYMMETRY THAT CAUSED IT
 * Two code paths build the same field and only one of them guarded:
 *
 *   readStrategy.ts          new Date(Number(item?.t) || 0)   guarded
 *   newSubscriptionStrategy  new Date(eventData.t)            NOT guarded
 *                            new Date(item.t)                 NOT guarded
 *                            new Date(item.timestamp)         NOT guarded
 *
 * Rows fetched in the snapshot were safe; rows arriving live over the
 * websocket were not. That is why it fires on a trading page with live orders
 * and almost nowhere else.
 *
 * `new Date(Number(x) || 0)` - the existing guard - is safe but silently
 * rewrites an unparseable timestamp to the Unix epoch, so a broken value
 * renders as "1/1/1970" and looks like data rather than damage. This returns
 * null instead, and the display layer renders a dash.
 *
 * Import-free so it is testable without a websocket or a renderer.
 */

/**
 * Parse a wire timestamp. Returns null when there is no usable date, rather
 * than an Invalid Date (which throws downstream) or the epoch (which lies).
 *
 * Accepts the three shapes the engine actually sends: epoch milliseconds as a
 * number, the same as a numeric string, and an ISO-8601 string.
 */
export const parseTimestamp = (value: unknown): Date | null => {
  if (value === null || value === undefined || value === "") return null;

  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? null : value;

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    // A purely numeric string is epoch millis, not a date string. `new Date("0")`
    // parses as the year 2000 in V8, which would be a silent, plausible lie.
    if (/^-?\d+$/.test(trimmed)) {
      const n = Number(trimmed);
      if (!Number.isFinite(n)) return null;
      const d = new Date(n);
      return Number.isNaN(d.getTime()) ? null : d;
    }

    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  return null;
};

/**
 * The same, for callers whose type says `Date` and cannot yet take null.
 *
 * Falls back to the epoch, matching readStrategy's existing behaviour, so
 * adopting this is never a behaviour change for those call sites - but the
 * value is at least always a VALID Date, which is what stops the throw.
 */
export const parseTimestampOrEpoch = (value: unknown): Date =>
  parseTimestamp(value) ?? new Date(0);
