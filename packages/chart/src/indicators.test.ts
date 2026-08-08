import { DAY_MS, ema, hasVwapData, rsi, vwap } from "./indicators";
import { Candle } from "./types";

/*
 * The reported symptom was "the VWAP toggle is inconsistent". Two causes, both
 * reproduced here:
 *
 *   1. It was cumulative over the LOADED WINDOW while the type documented it as
 *      "Session VWAP". Its anchor was whichever candle happened to be oldest in
 *      memory, so panning left or switching resolution changed every value.
 *   2. With no volume - which is most of testnet - it plots nothing while the
 *      button reads active.
 */

const DAY1 = Date.UTC(2026, 7, 6, 0, 0, 0); // 2026-08-06 00:00 UTC
const DAY2 = Date.UTC(2026, 7, 7, 0, 0, 0);

const bar = (
  time: number,
  price: number,
  volume: number,
  spread = 0
): Candle => ({
  time,
  open: price,
  high: price + spread,
  low: price - spread,
  close: price,
  volume,
});

describe("vwap - session anchoring", () => {
  it("resets at the session boundary instead of running on forever", () => {
    // Day 1 trades at 100. Day 2 trades at 200. A session VWAP on day 2 must
    // read 200, not an average dragged down by yesterday.
    const candles = [
      bar(DAY1 + 1 * 3_600_000, 100, 10),
      bar(DAY1 + 2 * 3_600_000, 100, 10),
      bar(DAY2 + 1 * 3_600_000, 200, 10),
      bar(DAY2 + 2 * 3_600_000, 200, 10),
    ];
    const out = vwap(candles);

    expect(out).toHaveLength(4);
    expect(out[1].value).toBeCloseTo(100, 10);
    expect(out[2].value).toBeCloseTo(200, 10); // reset, not 133.33
    expect(out[3].value).toBeCloseTo(200, 10);
  });

  it("THE bug: the value no longer depends on how much history is loaded", () => {
    // Same day-2 bars, different amounts of day-1 history in front of them.
    // Under the old cumulative version these two disagreed, which is exactly
    // what a user sees when they pan the chart left or switch timeframe.
    const day2 = [bar(DAY2 + 3_600_000, 200, 5), bar(DAY2 + 7_200_000, 300, 5)];

    const shortWindow = vwap([bar(DAY1 + 3_600_000, 100, 5), ...day2]);
    const longWindow = vwap([
      bar(DAY1 + 1_000, 10, 500),
      bar(DAY1 + 3_600_000, 100, 5),
      bar(DAY1 + 7_200_000, 100, 5),
      ...day2,
    ]);

    const lastOf = (o: { value: number }[]) => o[o.length - 1].value;
    expect(lastOf(shortWindow)).toBeCloseTo(lastOf(longWindow), 10);
    expect(lastOf(shortWindow)).toBeCloseTo(250, 10);
  });

  it("weights by volume, not by candle count", () => {
    // 1 unit at 100 and 9 units at 200 is 190, not 150.
    const out = vwap([bar(DAY1, 100, 1), bar(DAY1 + 60_000, 200, 9)]);
    expect(out[1].value).toBeCloseTo(190, 10);
  });

  it("uses the typical price (H+L+C)/3, not the close", () => {
    // Single bar, high 110 low 90 close 100 -> typical 100.
    const out = vwap([bar(DAY1, 100, 5, 10)]);
    expect(out[0].value).toBeCloseTo(100, 10);

    const skewed: Candle = {
      time: DAY1,
      open: 100,
      high: 130,
      low: 100,
      close: 100,
      volume: 5,
    };
    expect(vwap([skewed])[0].value).toBeCloseTo(110, 10);
  });

  it("accepts a custom session length", () => {
    // Weekly anchor: two days that are separate daily sessions become one.
    const candles = [bar(DAY1, 100, 10), bar(DAY2, 200, 10)];
    expect(vwap(candles, DAY_MS)[1].value).toBeCloseTo(200, 10);
    expect(vwap(candles, 7 * DAY_MS)[1].value).toBeCloseTo(150, 10);
  });

  it("returns nothing rather than inventing a line when there is no volume", () => {
    // Most of testnet. A flat line at the typical price would be a fabrication -
    // there is no traded price to weight.
    const flat = [bar(DAY1, 100, 0), bar(DAY1 + 60_000, 105, 0)];
    expect(vwap(flat)).toEqual([]);
    expect(hasVwapData(flat)).toBe(false);
  });

  it("starts plotting only from the first traded candle in the session", () => {
    const candles = [
      bar(DAY1, 100, 0),
      bar(DAY1 + 60_000, 100, 0),
      bar(DAY1 + 120_000, 100, 4),
    ];
    const out = vwap(candles);
    expect(out).toHaveLength(1);
    expect(out[0].time).toBe(DAY1 + 120_000);
    expect(hasVwapData(candles)).toBe(true);
  });

  it("ignores negative and non-finite volume rather than producing NaN", () => {
    // A NaN plots as a gap or an exception deep inside the charting library,
    // where the cause is unrecoverable.
    const junk = [
      { ...bar(DAY1, 100, 0), volume: Number.NaN },
      { ...bar(DAY1 + 60_000, 100, 0), volume: -50 },
      bar(DAY1 + 120_000, 200, 10),
    ];
    const out = vwap(junk);
    expect(out.every((p) => Number.isFinite(p.value))).toBe(true);
    expect(out).toHaveLength(1);
    expect(out[0].value).toBeCloseTo(200, 10);
  });

  it("survives empty input and a nonsensical session length", () => {
    expect(vwap([])).toEqual([]);
    expect(vwap([bar(DAY1, 100, 5)], 0)).toEqual([]);
    expect(vwap([bar(DAY1, 100, 5)], -1)).toEqual([]);
    expect(hasVwapData([])).toBe(false);
  });

  it("handles pre-1970 and boundary-exact timestamps without splitting oddly", () => {
    // Math.floor on a negative quotient is the trap here: -1ms must belong to
    // the session BEFORE the epoch, not the one after.
    const out = vwap([bar(-1, 100, 10), bar(0, 200, 10)]);
    expect(out[0].value).toBeCloseTo(100, 10);
    expect(out[1].value).toBeCloseTo(200, 10); // new session at exactly 0
  });
});

describe("the other overlays still behave (regression net)", () => {
  const series = Array.from({ length: 30 }, (_, i) =>
    bar(DAY1 + i * 60_000, 100 + i, 1)
  );

  it("ema emits one point per candle from period-1 onward", () => {
    expect(ema(series, 10)).toHaveLength(30 - 10 + 1);
    expect(ema(series, 50)).toEqual([]);
  });

  it("rsi emits from index period onward and stays within 0..100", () => {
    const out = rsi(series, 14);
    expect(out).toHaveLength(30 - 14);
    expect(out.every((p) => p.value >= 0 && p.value <= 100)).toBe(true);
  });
});
