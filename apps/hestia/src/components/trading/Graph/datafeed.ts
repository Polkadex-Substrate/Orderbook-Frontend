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
 * Market names arrive as "BASE/QUOTE"; GraphV1 built "BASE-QUOTE" and split on
 * "-". Accepting either separator means this keeps working whether it is handed
 * a market name or a market id.
 */
export const splitMarket = (market: string): [string, string] => {
  const [base = "", quote = ""] = market.split(/[/-]/);
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

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      "X-Gateway-Secret": GATEWAY_SECRET || "",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Datafeed history failed: HTTP ${response.status} from ${SERVER_BASE_URL}/gateway/history (resolution=${resolution})`
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
