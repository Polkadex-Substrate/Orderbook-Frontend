/**
 * REST datafeed adapter (datafeed.polkadex.ee) for the GraphV2 chart.
 *
 * The gateway speaks UDF - TradingView's Universal Data Feed - which returns
 * parallel arrays rather than an array of bars:
 *
 *   { s: "ok", t: [sec...], o: [...], h: [...], l: [...], c: [...], v: [...] }
 *
 * Two things about UDF that are easy to get wrong and expensive to debug:
 *
 *  1. `s: "no_data"` is a SUCCESS reply. It is the normal answer for a pair
 *     that has never traded in the requested window. Treating it as an error
 *     is what previously painted a red "Chart data not available" banner over
 *     a perfectly healthy testnet market. It maps to an empty bar list, which
 *     the chart renders as its own "no trades yet" empty state.
 *
 *  2. `t` is in SECONDS. CandleFeed.getCandles is specified in milliseconds.
 *     Getting this wrong puts every bar in 1970 and the chart renders blank
 *     with no error at all.
 *
 * Request shape follows the format the gateway already served for GraphV1:
 * the pair is split into `symbol` (base) and `vs_currency` (quote), and
 * authentication is the X-Gateway-Secret header. The gateway rejects
 * unauthenticated calls.
 */

import type { Candle, Resolution } from "@orderbook/chart";

const SERVER_BASE_URL = process.env.NEXT_PUBLIC_SERVER_BASE_URL;
const GATEWAY_SECRET = process.env.NEXT_PUBLIC_GATEWAY_SECRET;

/**
 * Resolutions this gateway actually serves.
 *
 * Straight from the gateway's own rejection message:
 *
 *   Invalid resolution: X. Must be one of: 1, 5, 60, 1D, 1d, D, d.
 *
 * "1d", "D" and "d" are aliases for daily, so there are four distinct
 * intervals: 1m, 5m, 1h and 1D. The chart's Resolution type also defines 15,
 * 30, 240 and 1W - those are NOT available here, and the toolbar is given this
 * list so it does not render buttons that always error.
 *
 * Deliberately not mapped to a nearest neighbour: quietly serving 5m candles
 * to someone who asked for 15m is worse than not offering 15m, because the
 * chart would be silently wrong rather than visibly limited. If these
 * intervals are wanted, they have to be added gateway-side.
 */
export const DATAFEED_RESOLUTIONS: readonly Resolution[] = [
  "1",
  "5",
  "60",
  "1D",
];

/** Longer than the observed 45 s worst case would be pointless - the poll only
 *  wants the current bar, and a reply that late is already superseded. */
const REQUEST_TIMEOUT_MS = 20_000;

type UdfResponse = {
  s: "ok" | "no_data" | "error";
  errmsg?: string;
  t?: number[];
  o?: (number | string)[];
  h?: (number | string)[];
  l?: (number | string)[];
  c?: (number | string)[];
  v?: (number | string)[];
};

/**
 * Split a market into the gateway's `symbol` / `vs_currency` pair.
 *
 * Expects a TICKER pair - "WETH/PDEX" (Market.name). It must NOT be handed
 * Market.id, which is "{baseAssetId}-{quoteAssetId}" like "8-6": the gateway
 * resolves tickers only and answers asset ids with 404 "asset not found".
 *
 * This function originally accepted "/" or "-" so it would work with "whatever
 * it was handed". That leniency was the bug: passing an asset-id pair was
 * silently well-formed, and the mistake only surfaced as a 404 from a remote
 * service on a market whose ticker digits differed. Numeric segments are now
 * rejected here, at the boundary, where the message can say what is wrong.
 */
export const splitMarket = (market: string): [string, string] => {
  const [base = "", quote = ""] = market.split(/[/-]/);

  // Tickers are never all-digits; asset ids always are.
  if (/^\d+$/.test(base) || /^\d+$/.test(quote)) {
    throw new Error(
      `Datafeed needs a ticker pair like "WETH/PDEX", got asset ids "${market}". Pass Market.name, not Market.id.`
    );
  }

  return [base, quote];
};

const toSeconds = (d: Date) => Math.floor(d.getTime() / 1000);

/**
 * Fetch history for one market/resolution window.
 *
 * Resolution values are passed through unchanged: the chart's Resolution type
 * ("1" | "5" | "15" | "30" | "60" | "240" | "1D" | "1W") is already the UDF
 * vocabulary the gateway expects, so no mapping table is needed - and a
 * mapping table would be one more place to drift.
 */
export const fetchUdfHistory = async ({
  market,
  resolution,
  from,
  to,
}: {
  market: string;
  resolution: Resolution;
  from: Date;
  to: Date;
}): Promise<Candle[]> => {
  if (!SERVER_BASE_URL) {
    throw new Error(
      "NEXT_PUBLIC_SERVER_BASE_URL is not set - the chart datafeed has no endpoint. It is baked in at build time, so this needs a rebuild, not a restart."
    );
  }

  if (!DATAFEED_RESOLUTIONS.includes(resolution)) {
    throw new Error(
      `Resolution "${resolution}" is not served by this datafeed. Supported: ${DATAFEED_RESOLUTIONS.join(", ")}.`
    );
  }

  const [symbol, quote] = splitMarket(market);
  if (!symbol || !quote) {
    // An unparseable market would otherwise become "symbol=&vs_currency=" and
    // come back as no_data, i.e. an empty chart with no explanation.
    throw new Error(
      `Could not derive symbol/vs_currency from market "${market}"`
    );
  }

  const url =
    `${SERVER_BASE_URL}/gateway/history` +
    `?symbol=${encodeURIComponent(symbol)}` +
    `&vs_currency=${encodeURIComponent(quote)}` +
    `&resolution=${encodeURIComponent(resolution)}` +
    `&from=${toSeconds(from)}&to=${toSeconds(to)}`;

  // Bound the request. Production logs show this endpoint occasionally taking
  // 45 s (cold upstream), and an unbounded fetch behind a 15 s poll means
  // requests pile up rather than one being slow.
  //
  // No Content-Type: there is no request body, so it means nothing on a GET.
  // The preflight in the logs comes from X-Gateway-Secret - any custom header
  // makes the request non-simple - so it cannot be removed client-side. The
  // gateway can kill almost all of that OPTIONS traffic by returning
  // `Access-Control-Max-Age`, which it currently does not.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "X-Gateway-Secret": GATEWAY_SECRET || "" },
      signal: controller.signal,
    });
  } catch (e) {
    if ((e as Error)?.name === "AbortError") {
      throw new Error(
        `Datafeed history timed out after ${REQUEST_TIMEOUT_MS / 1000}s\n  GET ${url}`
      );
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    // Include the full query string. It carries no secret (auth is a header),
    // and without it a 404 is ambiguous between an unsupported resolution, an
    // unknown symbol and an unsupported vs_currency - three different fixes.
    // Response body too: gateways often explain the 404 in it.
    const body = await response.text().catch(() => "");
    // `status` lets the poller in GraphV2 tell a 429 apart from a timeout or
    // a 500 and back off instead of retrying at the same fixed cadence.
    throw Object.assign(
      new Error(
        `Datafeed history failed: HTTP ${response.status}\n  GET ${url}\n  body: ${
          body.slice(0, 300) || "(empty)"
        }`
      ),
      { status: response.status }
    );
  }

  const data: UdfResponse = await response.json();

  // Success, just nothing to draw. See note 1 above.
  if (data.s === "no_data") return [];

  if (data.s !== "ok") {
    throw new Error(data.errmsg || `Datafeed returned s="${data.s}"`);
  }

  const { t, o, h, l, c, v } = data;
  if (!t?.length) return [];

  return t.map((seconds, i) => ({
    time: seconds * 1000, // seconds -> ms. See note 2 above.
    open: Number(o?.[i] ?? 0),
    high: Number(h?.[i] ?? 0),
    low: Number(l?.[i] ?? 0),
    close: Number(c?.[i] ?? 0),
    volume: Number(v?.[i] ?? 0),
  }));
};
