/** One OHLCV bar. `time` is in MILLISECONDS (matches @orderbook/core's
 *  fetchCandles/processKlineData output); components convert to the seconds
 *  lightweight-charts expects. */
export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

/** Supported resolutions, in the same notation @orderbook/core understands. */
export const RESOLUTIONS = [
  "1",
  "5",
  "15",
  "30",
  "60",
  "240",
  "1D",
  "1W",
] as const;
export type Resolution = (typeof RESOLUTIONS)[number];

export const RESOLUTION_LABELS: Record<Resolution, string> = {
  "1": "1m",
  "5": "5m",
  "15": "15m",
  "30": "30m",
  "60": "1h",
  "240": "4h",
  "1D": "1D",
  "1W": "1W",
};

export function resolutionToMs(r: Resolution): number {
  const MIN = 60_000;
  switch (r) {
    case "1D":
      return 24 * 60 * MIN;
    case "1W":
      return 7 * 24 * 60 * MIN;
    default:
      return Number(r) * MIN;
  }
}

export type ChartType = "candles" | "bars" | "area";

/** The only integration surface an app must implement: how to load history
 *  and how to stream updates for a market at a resolution. Both @orderbook/core
 *  apps can satisfy this with fetchCandles + onCandleSubscribe. */
export interface CandleFeed {
  /** Historical bars, ASCENDING by time, `time` in ms. */
  getCandles(args: {
    market: string;
    resolution: Resolution;
    from: Date;
    to: Date;
  }): Promise<Candle[]>;
  /** Live updates for the current bucket (or a new bucket). Returns an
   *  unsubscribe fn; return a no-op if the transport can't unsubscribe. */
  subscribe(args: {
    market: string;
    resolution: Resolution;
    onBar: (bar: Candle) => void;
  }): () => void;
}

/** An open order to draw as a horizontal price line. */
export type OrderMark = {
  id: string;
  side: "Bid" | "Ask";
  price: number;
  qty: number;
};

/** A fill/trade to draw as an arrow marker. */
export type FillMark = {
  id: string;
  side: "Bid" | "Ask";
  price: number;
  qty: number;
  /** ms */
  time: number;
};

/** One price level: [price, quantity]. Depth arrays are best-first
 *  (bids descending, asks ascending), quantities NON-cumulative. */
export type DepthLevel = [number, number];

export type IndicatorConfig = {
  /** EMA periods to overlay, e.g. [20, 50]. Empty/undefined = off. */
  ema?: number[];
  /** Session VWAP overlay. */
  vwap?: boolean;
  /** RSI pane (period 14) below the price chart. */
  rsi?: boolean;
};

export type ChartTheme = {
  background: string;
  text: string;
  grid: string;
  up: string;
  down: string;
  volumeUp: string;
  volumeDown: string;
  accent: string;
  watermark: string;
};

export const DARK_THEME: ChartTheme = {
  background: "#0d0d0f",
  text: "#d1d4dc",
  grid: "#1f1f2b",
  up: "#26a69a",
  down: "#ef5350",
  volumeUp: "rgba(38, 166, 154, 0.45)",
  volumeDown: "rgba(239, 83, 80, 0.45)",
  accent: "#2D6BFF",
  watermark: "rgba(171, 192, 227, 0.05)",
};

export const LIGHT_THEME: ChartTheme = {
  background: "#ffffff",
  text: "#2b2b43",
  grid: "#ececf1",
  up: "#26a69a",
  down: "#ef5350",
  volumeUp: "rgba(38, 166, 154, 0.45)",
  volumeDown: "rgba(239, 83, 80, 0.45)",
  accent: "#2D6BFF",
  watermark: "rgba(40, 60, 90, 0.06)",
};
