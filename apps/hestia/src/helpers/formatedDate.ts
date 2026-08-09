import { intlFormat } from "date-fns";

/**
 * Format a timestamp for a table cell, without the ability to take the table
 * down with it.
 *
 * SENTRY POLKADEX-ORDERBOOK-FE-TEST-B. `Intl.DateTimeFormat.format()` and
 * date-fns' `intlFormat` both THROW "RangeError: Invalid time value" on an
 * Invalid Date - they do not degrade to the string "Invalid Date" the way
 * `String(date)` does. This function is called from a `cell` renderer, so one
 * unparseable timestamp in one row threw during render and cost the user the
 * entire orders table.
 *
 * The ingest-side fix (parseTimestampOrEpoch, applied in
 * newSubscriptionStrategy) stops bad values being created. This is the second
 * line: a render path should not be able to throw over a display value at all,
 * whatever some future code path decides to hand it.
 *
 * Returns UNKNOWN_DATE rather than a fabricated date. "1/1/1970" would look
 * like data; a dash looks like what it is.
 */
export const UNKNOWN_DATE = "-";

const usable = (value: unknown): Date | null => {
  if (value === null || value === undefined || value === "") return null;
  const d = value instanceof Date ? value : new Date(value as string | number);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const formatedDate = (
  value: Date | string | number | null | undefined,
  short = true
): string => {
  const date = usable(value);
  if (!date) return UNKNOWN_DATE;

  return short
    ? new Intl.DateTimeFormat("en-US", {
        month: "numeric",
        day: "2-digit",
        hour: "numeric",
        minute: "numeric",
      })
        .format(date)
        .replace(",", "")
    : intlFormat(
        date,
        {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        },
        { locale: "EN" }
      );
};
