import { percentChange, readTickerStats } from "./tickerEnvelope";

/*
 * Ground truth: the footer ticker strip and the Markets panel showed every pair
 * at price 0 and change +0.00%, on a chain where the datafeed gateway was
 * serving real prices for the same pairs. `getTicker` read
 * `items?.o` and friends and turned every failure into null, which the UI
 * rendered as 0 - so "no trades in 24h", "the envelope changed shape" and "the
 * query soft-failed" were all displayed identically.
 */

const stats = { o: "100", c: "110", h: "115", l: "95", vb: "5", vq: "550" };

describe("readTickerStats", () => {
  it("reads the object form the generated types promise", () => {
    const r = readTickerStats(stats);
    expect(r.status).toBe("ok");
    expect(r.stats).toEqual(stats);
  });

  it("ALSO reads the array form, which every sibling connection uses", () => {
    // The generated API.ts was produced against the retired AppSync schema.
    // If the Rust server returns a list here - as it does for markets, balances
    // and orders - the old code read `[].o`, got undefined, and zeroed the
    // entire ticker strip without a single error anywhere.
    const r = readTickerStats([stats]);
    expect(r.status).toBe("ok");
    expect(r.stats).toEqual(stats);
  });

  it("takes the first usable entry when the array has several", () => {
    const other = { o: "1", c: "2", h: "3", l: "0", vb: "1", vq: "2" };
    expect(readTickerStats([stats, other]).stats).toEqual(stats);
  });

  it("calls a genuinely absent result EMPTY, not a failure", () => {
    // No trades in the window is an honest zero and must not raise an alarm.
    expect(readTickerStats(null).status).toBe("empty");
    expect(readTickerStats(undefined).status).toBe("empty");
    expect(readTickerStats([]).status).toBe("empty");
  });

  it("calls an unrecognisable shape UNREADABLE, and says why", () => {
    const r = readTickerStats({ totallyDifferent: 1, fields: 2 });
    expect(r.status).toBe("unreadable");
    if (r.status !== "unreadable") throw new Error("unreachable");
    expect(r.reason).toContain("totallyDifferent");
  });

  it("does not mistake a populated array of wrong objects for data", () => {
    const r = readTickerStats([{ nope: 1 }, { alsoNope: 2 }]);
    expect(r.status).toBe("unreadable");
    if (r.status !== "unreadable") throw new Error("unreachable");
    expect(r.reason).toContain("2 entries");
  });

  it("accepts a partial record - a market with volume but no close", () => {
    // Presence of ANY ticker field means the server answered in the right
    // shape; missing individual fields are the caller's problem to null-handle.
    const r = readTickerStats({ vb: "0", vq: "0" });
    expect(r.status).toBe("ok");
  });

  it("rejects scalars rather than treating them as a record", () => {
    expect(readTickerStats("oops").status).toBe("unreadable");
    expect(readTickerStats(42).status).toBe("unreadable");
  });
});

describe("percentChange", () => {
  it("computes the ordinary case", () => {
    expect(percentChange(100, 110)).toBeCloseTo(10, 10);
    expect(percentChange(100, 90)).toBeCloseTo(-10, 10);
  });

  it("THE Infinity case: a window opening at zero has no baseline", () => {
    // isNaN(Infinity) is false, so the old guard let this through and the UI
    // would render "Infinity%".
    expect(percentChange(0, 5)).toBeNull();
    expect(percentChange(0, 0)).toBeNull();
  });

  it("returns null rather than 0 when either side is unknown", () => {
    // Number(null) is 0, which is how a missing open became a confident 0%.
    expect(percentChange(null, 110)).toBeNull();
    expect(percentChange(100, null)).toBeNull();
    expect(percentChange(undefined, undefined)).toBeNull();
  });

  it("returns null for non-finite inputs", () => {
    expect(percentChange(Number.NaN, 100)).toBeNull();
    expect(percentChange(100, Number.NaN)).toBeNull();
    expect(percentChange(Infinity, 100)).toBeNull();
  });

  it("reports a real zero change as 0, not as unknown", () => {
    // The distinction the whole exercise is about: 0% moved is a fact.
    expect(percentChange(100, 100)).toBe(0);
  });

  it("handles negative opens without inverting the sign", () => {
    // Not expected on a price, but the arithmetic should not lie if it happens.
    expect(percentChange(-100, -110)).toBeCloseTo(10, 10);
  });
});
