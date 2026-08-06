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

/** Volume-weighted average price, cumulative over the loaded window
 *  (typical-price weighting). One point per candle with volume > 0 history. */
export function vwap(candles: Candle[]): LinePoint[] {
  const out: LinePoint[] = [];
  let cumPV = 0;
  let cumV = 0;
  for (const c of candles) {
    const typical = (c.high + c.low + c.close) / 3;
    cumPV += typical * c.volume;
    cumV += c.volume;
    if (cumV > 0) out.push({ time: c.time, value: cumPV / cumV });
  }
  return out;
}
