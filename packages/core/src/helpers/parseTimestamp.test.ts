import { parseTimestamp, parseTimestampOrEpoch } from "./parseTimestamp";

/*
 * Ground truth: POLKADEX-ORDERBOOK-FE-TEST-B, "RangeError: Invalid time value"
 * thrown from a table cell on /trading/PDEXUSDT. Intl.DateTimeFormat.format()
 * THROWS on an Invalid Date, so one bad row destroyed the whole table.
 */

describe("parseTimestamp", () => {
  it("parses epoch milliseconds as a number", () => {
    const d = parseTimestamp(1_754_700_000_000);
    expect(d?.getTime()).toBe(1_754_700_000_000);
  });

  it("parses epoch milliseconds sent as a numeric STRING", () => {
    // The engine sends `t` as a string on some paths. `new Date("1754700000000")`
    // is Invalid; Number() first is required.
    const d = parseTimestamp("1754700000000");
    expect(d?.getTime()).toBe(1_754_700_000_000);
  });

  it("parses an ISO-8601 string", () => {
    expect(parseTimestamp("2026-08-09T03:12:09.000Z")?.toISOString()).toBe(
      "2026-08-09T03:12:09.000Z"
    );
  });

  it("passes a valid Date through and rejects an invalid one", () => {
    const valid = new Date(1_754_700_000_000);
    expect(parseTimestamp(valid)).toBe(valid);
    expect(parseTimestamp(new Date("nonsense"))).toBeNull();
  });

  it("THE bug: every unusable input yields null, never an Invalid Date", () => {
    // Each of these previously produced an Invalid Date that reached
    // Intl.DateTimeFormat.format() and threw inside a table cell.
    for (const bad of [
      undefined,
      null,
      "",
      "   ",
      "not-a-date",
      Number.NaN,
      Infinity,
      -Infinity,
      {},
      [],
      true,
    ]) {
      const d = parseTimestamp(bad);
      expect(d).toBeNull();
    }
  });

  it("never returns a Date that would throw when formatted", () => {
    // The property that matters: whatever comes back can be handed to Intl.
    const fmt = new Intl.DateTimeFormat("en-US");
    for (const input of [
      1_754_700_000_000,
      "1754700000000",
      "2026-08-09T03:12:09.000Z",
      "not-a-date",
      undefined,
      Number.NaN,
      {},
    ]) {
      const d = parseTimestamp(input);
      if (d) expect(() => fmt.format(d)).not.toThrow();
    }
  });

  it("treats a numeric string as epoch millis, not as a year", () => {
    // `new Date("0")` is the year 2000 in V8 - a plausible-looking lie. As
    // epoch millis, "0" is 1970-01-01, which is the truth.
    expect(parseTimestamp("0")?.getTime()).toBe(0);
    expect(parseTimestamp("2000")?.getTime()).toBe(2000);
  });

  it("accepts epoch zero rather than treating it as absent", () => {
    // `if (!value)` would have discarded it. 0 is a real instant.
    expect(parseTimestamp(0)?.getTime()).toBe(0);
  });

  it("handles negative epochs (pre-1970) without rejecting them", () => {
    expect(parseTimestamp(-1)?.getTime()).toBe(-1);
  });
});

describe("parseTimestampOrEpoch", () => {
  it("matches readStrategy's existing fallback, so adopting it changes nothing", () => {
    // readStrategy already did `new Date(Number(item?.t) || 0)`.
    expect(parseTimestampOrEpoch(undefined).getTime()).toBe(0);
    expect(parseTimestampOrEpoch("rubbish").getTime()).toBe(0);
    expect(parseTimestampOrEpoch(1_754_700_000_000).getTime()).toBe(
      1_754_700_000_000
    );
  });

  it("always returns a Date that can be formatted", () => {
    const fmt = new Intl.DateTimeFormat("en-US");
    for (const bad of [undefined, null, "", "x", Number.NaN, {}]) {
      expect(() => fmt.format(parseTimestampOrEpoch(bad))).not.toThrow();
    }
  });
});
