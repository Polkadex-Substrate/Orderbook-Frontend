import {
  Settled,
  TICKERS_REFETCH_MS,
  collectSettled,
  describeBatch,
  isTotalFailure,
} from "./tickerBatch";

/*
 * Ground truth, measured on testnet: every market row showed volume 0 and
 * change "-", while the orderbook on the same page had live prices. The ticker
 * query used `Promise.all`, so one market's rejection discarded every market
 * that had succeeded.
 */

const ok = <T>(value: T): Settled<T> => ({ status: "fulfilled", value });
const bad = (reason: string): Settled<never> => ({
  status: "rejected",
  reason: new Error(reason),
});

describe("collectSettled - one bad market must not erase the rest", () => {
  it("keeps every success when one market fails", () => {
    // THE bug. Under Promise.all this scenario returned nothing at all, which
    // is how a single bad pair rendered the whole exchange as zero volume.
    const batch = collectSettled([
      ok("PDEX-USDT"),
      bad("WSTETH-WETH timed out"),
      ok("WETH-USDT"),
    ]);
    expect(batch.fulfilled).toEqual(["PDEX-USDT", "WETH-USDT"]);
    expect(batch.failedCount).toBe(1);
    expect(batch.attempted).toBe(3);
  });

  it("returns everything when nothing fails", () => {
    const batch = collectSettled([ok(1), ok(2), ok(3)]);
    expect(batch.fulfilled).toHaveLength(3);
    expect(batch.failedCount).toBe(0);
  });

  it("survives an empty market list", () => {
    const batch = collectSettled([]);
    expect(batch.fulfilled).toEqual([]);
    expect(isTotalFailure(batch)).toBe(false);
  });

  it("counts a malformed entry as a failure rather than throwing", () => {
    // Defensive: this runs inside a queryFn, and an exception here would take
    // out the whole query - the exact failure mode being fixed.
    const batch = collectSettled([
      ok("a"),
      undefined as unknown as Settled<string>,
    ]);
    expect(batch.fulfilled).toEqual(["a"]);
    expect(batch.failedCount).toBe(1);
  });
});

describe("isTotalFailure - partial data is not failure", () => {
  it("is false when anything at all came back", () => {
    expect(isTotalFailure(collectSettled([ok(1), bad("x"), bad("y")]))).toBe(
      false
    );
  });

  it("is true only when every market failed", () => {
    expect(isTotalFailure(collectSettled([bad("x"), bad("y")]))).toBe(true);
  });

  it("is false for an empty list, which is not a failure", () => {
    // No markets yet is a loading state, not an error. Reporting it as failure
    // would fire on every cold start.
    expect(isTotalFailure(collectSettled([]))).toBe(false);
  });
});

describe("describeBatch", () => {
  it("says nothing when nothing failed", () => {
    expect(describeBatch(collectSettled([ok(1), ok(2)]))).toBeNull();
  });

  it("names how many failed and how many survived", () => {
    const line =
      describeBatch(collectSettled([ok(1), bad("x"), bad("y")])) ?? "";
    expect(line).toContain("2 of 3");
    expect(line).toContain("1");
  });
});

describe("the refetch that did not exist", () => {
  it("polls, because the old query never asked again after failing", () => {
    // Measured: no API call for eleven minutes after the initial failures.
    // `refetchOnMount: false` with no interval means a blip at load is
    // permanent for the session.
    expect(TICKERS_REFETCH_MS).toBeGreaterThan(0);
    expect(TICKERS_REFETCH_MS).toBeLessThanOrEqual(60_000);
  });
});
