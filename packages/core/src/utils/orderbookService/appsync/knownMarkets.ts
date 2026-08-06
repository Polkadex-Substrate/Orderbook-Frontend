/**
 * Split API rows into those whose market this client knows about, and those it
 * does not.
 *
 * WHY THIS EXISTS
 * `mapApiOrderToOrder` THROWS when it cannot resolve a row's market id against
 * the cached market list. `getOpenOrders` called it inside a bare `.map`, so a
 * single row referencing an unknown market threw out of the map and rejected the
 * whole query - every open order vanished from the UI while the rows sat happily
 * in the SpotOrders table.
 *
 * Order history and trade history already guarded this with a `.filter` before
 * mapping. Open orders was the one that did not, which is why it was the one that
 * broke.
 *
 * A market id can legitimately be missing from the list: a pair that was closed
 * (or closed and re-registered, as happens during a trading-pair parameter
 * change) still has historical orders referencing it, and a pair added after the
 * market list was fetched is unknown until the next refresh. One unrecognised
 * row must cost that row, not the entire list.
 *
 * Import-free so it can be unit tested without the read strategy or a transport.
 */

/** Any API row that names a market. `m` is the market id in the wire format. */
export type HasMarketId = { m?: string | null };

export type MarketSplit<T> = {
  /** Rows safe to map - their market resolves. */
  known: T[];
  /** Rows dropped, kept for logging so the loss is never silent. */
  unknown: T[];
  /** Distinct unresolved market ids, for a single readable warning. */
  unknownMarketIds: string[];
};

export const splitByKnownMarket = <T extends HasMarketId>(
  items: readonly T[] | null | undefined,
  marketIds: readonly string[] | null | undefined
): MarketSplit<T> => {
  const ids = new Set((marketIds ?? []).filter(Boolean));

  const known: T[] = [];
  const unknown: T[] = [];

  for (const item of items ?? []) {
    // A row with no market id at all cannot be mapped either - it would hit the
    // same throw - so it belongs with the unknowns.
    if (item?.m && ids.has(item.m)) known.push(item);
    else unknown.push(item);
  }

  const unknownMarketIds = Array.from(
    new Set(unknown.map((i) => i?.m).filter((m): m is string => Boolean(m)))
  );

  return { known, unknown, unknownMarketIds };
};

/**
 * The warning text for dropped rows. Separated so its wording is testable and so
 * the caller cannot accidentally log the rows themselves - order rows carry user
 * addresses.
 */
export const describeSkippedMarkets = (
  split: MarketSplit<unknown>,
  context: string
): string | null => {
  if (split.unknown.length === 0) return null;

  const ids = split.unknownMarketIds.length
    ? split.unknownMarketIds.join(", ")
    : "(rows with no market id)";

  return (
    `[${context}] skipped ${split.unknown.length} row(s) for unknown market(s): ${ids}. ` +
    `They are absent from the cached market list - a closed or newly added pair. ` +
    `The remaining ${split.known.length} row(s) were returned.`
  );
};
