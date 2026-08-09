import { formatedDate, UNKNOWN_DATE } from "./formatedDate";

/*
 * Ground truth: POLKADEX-ORDERBOOK-FE-TEST-B. This function is called from a
 * table `cell`, and Intl.DateTimeFormat.format() throws on an Invalid Date, so
 * one bad row took out the entire orders table mid-render.
 */

const REAL = new Date("2026-08-09T03:12:09.000Z");

describe("formatedDate", () => {
  it("formats a valid date in both modes", () => {
    expect(formatedDate(REAL)).not.toBe(UNKNOWN_DATE);
    expect(formatedDate(REAL, false)).not.toBe(UNKNOWN_DATE);
  });

  it("THE bug: never throws, whatever a row hands it", () => {
    // Every one of these previously reached Intl and threw during render.
    for (const bad of [
      undefined,
      null,
      "",
      "not-a-date",
      new Date("nonsense"),
      Number.NaN,
      {} as never,
    ]) {
      expect(() => formatedDate(bad as never)).not.toThrow();
      expect(() => formatedDate(bad as never, false)).not.toThrow();
      expect(formatedDate(bad as never)).toBe(UNKNOWN_DATE);
    }
  });

  it("shows a dash rather than fabricating 1/1/1970", () => {
    // The pre-existing `new Date(Number(t) || 0)` guard elsewhere rewrites a
    // broken timestamp to the epoch, which renders as real-looking data.
    expect(formatedDate(undefined)).toBe(UNKNOWN_DATE);
    expect(formatedDate(undefined)).not.toContain("1970");
  });

  it("still renders a genuine epoch-zero timestamp", () => {
    // 0 is a real instant, not an absent one. Only unusable input gets a dash.
    expect(formatedDate(new Date(0))).not.toBe(UNKNOWN_DATE);
  });

  it("accepts the string and number forms a wire payload may carry", () => {
    expect(formatedDate(REAL.getTime())).not.toBe(UNKNOWN_DATE);
    expect(formatedDate(REAL.toISOString())).not.toBe(UNKNOWN_DATE);
  });
});
