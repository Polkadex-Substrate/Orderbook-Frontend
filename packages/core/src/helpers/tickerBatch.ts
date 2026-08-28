/**
 * Fetching many markets' tickers without letting one failure erase them all.
 *
 * THE BUG THIS FIXES
 * Every market on the trading page showed volume `0` and change `-`:
 *
 *     WSTETH/WETH  0  -      WETH/USDT  0  -      WBTC/USDT  0  -
 *     USDC/USDT    0  -      LINK/USDT  0  -      ...
 *
 * and the pair header showed `-%` change, blank 24h high and low, `0.00`
 * volume. Meanwhile the ORDERBOOK on the same page had live prices, so the API,
 * the socket and the auth token were all fine. Only the ticker column was dead.
 *
 * Measured on testnet: `GetMarketTickers` logged about twenty failures in the
 * first three seconds, then the app made no further API call for eleven
 * minutes. Two independent causes, and both had to be true to produce that.
 *
 *   1. `Promise.all` over every market. It rejects on the FIRST rejection, so
 *      one market failing discards the tickers of every other market that
 *      succeeded. That is why the failure is all-or-nothing rather than one
 *      blank row, and it is why this looked like a total outage rather than a
 *      single bad pair.
 *
 *   2. `refetchOnMount: false` and no `refetchInterval`. Once react-query has
 *      exhausted its retries the query sits in an error state and nothing ever
 *      asks again. The eleven minutes of silence is that: not a slow retry, no
 *      retry. A user who loads the page during a blip has empty tickers until
 *      they hard-reload, however long they sit there.
 *
 * `Promise.allSettled` makes a failure cost one row instead of the whole table.
 * That is the difference between "this pair has no data yet" and "the exchange
 * appears to have no volume anywhere", which is what we were showing.
 *
 * Import-free and pure so both rules are testable without a network.
 */

/** What `Promise.allSettled` gives back, narrowed to what we use. */
export type Settled<T> =
  { status: "fulfilled"; value: T } | { status: "rejected"; reason: unknown };

export type TickerBatch<T> = {
  /** Everything that came back. The whole point: partial success is success. */
  fulfilled: T[];
  /** How many markets failed, for the log line. */
  failedCount: number;
  /** Total attempted, so a caller can tell "all failed" from "some failed". */
  attempted: number;
};

export const collectSettled = <T>(results: Settled<T>[]): TickerBatch<T> => {
  const fulfilled: T[] = [];
  let failedCount = 0;
  for (const r of results) {
    if (r && r.status === "fulfilled") fulfilled.push(r.value);
    else failedCount += 1;
  }
  return { fulfilled, failedCount, attempted: results.length };
};

/**
 * Should the batch be treated as a failure?
 *
 * Only when NOTHING came back. Partial data beats no data: a user with nine of
 * ten markets populated can trade the nine, and the tenth showing "-" is honest.
 * Throwing here would restore exactly the all-or-nothing behaviour being fixed.
 */
export const isTotalFailure = <T>(batch: TickerBatch<T>): boolean =>
  batch.attempted > 0 && batch.fulfilled.length === 0;

/** One log line for a partial failure, or null when everything worked. */
export const describeBatch = <T>(batch: TickerBatch<T>): string | null => {
  if (batch.failedCount === 0) return null;
  return `[tickers] ${batch.failedCount} of ${batch.attempted} markets failed to return ticker data; showing the ${batch.fulfilled.length} that did`;
};

/**
 * How often to ask again.
 *
 * The old query had no refetch of any kind, so a failure at load was permanent
 * for the session. Thirty seconds matches the other polled queries in this
 * package and means a transient failure costs half a minute of blank cells
 * rather than the whole visit.
 */
export const TICKERS_REFETCH_MS = 30_000;
