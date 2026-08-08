import { Candle } from "./types";

export type LinePoint = { time: number; value: number };

/** Exponential moving average of closes. Emits one point per input candle
 *  from index `period-1` onward (seeded with an SMA, standard convention). */
export function ema(candles: Candle[], period: number): LinePoint[] {
  if (period <= 0 || candles.length < period) return [];
  const k = 2 / (period + 1);
  const out: LinePoint[] = [];
  let seed = 0;
  for (let i = 0; i < period; i++) seed += candles[i].close;
  let prev = seed / period;
  out.push({ time: candles[period - 1].time, value: prev });
  for (let i = period; i < candles.length; i++) {
    prev = candles[i].close * k + prev * (1 - k);
    out.push({ time: candles[i].time, value: prev });
  }
  return out;
}

/** Wilder's RSI over closes. Emits from index `period` onward. */
export function rsi(candles: Candle[], period = 14): LinePoint[] {
  if (candles.length <= period) return [];
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = candles[i].close - candles[i - 1].close;
    if (d >= 0) gain += d;
    else loss -= d;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  const out: LinePoint[] = [];
  const point = (i: number) => {
    const rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
    out.push({
      time: candles[i].time,
      value: avgLoss === 0 ? 100 : 100 - 100 / (1 + rs),
    });
  };
  point(period);
  for (let i = period + 1; i < candles.length; i++) {
    const d = candles[i].close - candles[i - 1].close;
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
    point(i);
  }
  return out;
}

/** One UTC day, the standard anchor for an intraday VWAP. */
export const DAY_MS = 86_400_000;

/**
 * Volume-weighted average price, anchored to a session.
 *
 * WHAT WAS WRONG BEFORE
 * This accumulated across every candle in the loaded window with no reset,
 * while `IndicatorConfig.vwap` documented it as "Session VWAP". Both things
 * cannot be true, and the cumulative version is the one users notice, because
 * its anchor is "whichever candle happens to be oldest in memory right now":
 *
 *   - Pan left, more history loads, and every plotted value silently changes.
 *   - Switch 1m to 1h and the same instant reads a different VWAP, because the
 *     two resolutions load different spans.
 *
 * A line that moves when you scroll is not a VWAP, it is an average of an
 * arbitrary window. Anchoring to the session makes the value a property of the
 * market rather than of the viewport.
 *
 * Candles are assumed ascending by time, as CandleFeed.getCandles specifies.
 * `time` is in MILLISECONDS (see the Candle type).
 *
 * ZERO VOLUME
 * VWAP is undefined without volume - there is no price to weight. A session
 * with no trades yields NO POINTS rather than a flat line at the typical price,
 * which would be an invention. Callers must treat an empty result as "not
 * available", not as "nothing happened"; `hasVwapData` below exists so the UI
 * can say so instead of lighting up a toggle that draws nothing.
 */
export function vwap(candles: Candle[], sessionMs: number = DAY_MS): LinePoint[] {
  if (sessionMs <= 0) return [];

  const out: LinePoint[] = [];
  let cumPV = 0;
  let cumV = 0;
  let session: number | null = null;

  for (const c of candles) {
    const current = Math.floor(c.time / sessionMs);
    if (session === null || current !== session) {
      session = current;
      cumPV = 0;
      cumV = 0;
    }

    const typical = (c.high + c.low + c.close) / 3;
    const volume = Number.isFinite(c.volume) && c.volume > 0 ? c.volume : 0;
    cumPV += typical * volume;
    cumV += volume;

    if (cumV > 0) out.push({ time: c.time, value: cumPV / cumV });
  }
  return out;
}

/**
 * Would a VWAP overlay actually draw anything for these candles?
 *
 * The toggle used to light up and plot nothing on a market with no trades -
 * which is most of testnet - leaving "is the button broken?" as the only
 * available conclusion. The UI needs to distinguish "off" from "on but
 * undefined", and that needs a cheap answer it can ask before rendering.
 */
export function hasVwapData(
  candles: Candle[],
  sessionMs: number = DAY_MS
): boolean {
  return vwap(candles, sessionMs).length > 0;
}
