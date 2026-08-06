import { splitByKnownMarket, describeSkippedMarkets } from "./knownMarkets";

/*
 * The bug being pinned: ONE row with an unresolvable market id used to throw out
 * of `getOpenOrders`'s `.map`, rejecting the whole query. Every open order
 * disappeared from the UI while the rows were present in the database.
 *
 * The invariant is therefore "one bad row costs one row" - never the list.
 */

const MARKETS = ["WBTC-USDT", "WETH-USDT", "PDEX-USDT"];

describe("splitByKnownMarket", () => {
  it("keeps rows whose market resolves", () => {
    const rows = [
      { m: "WBTC-USDT", id: "1" },
      { m: "WETH-USDT", id: "2" },
    ];
    const split = splitByKnownMarket(rows, MARKETS);
    expect(split.known).toHaveLength(2);
    expect(split.unknown).toHaveLength(0);
    expect(split.unknownMarketIds).toEqual([]);
  });

  it("ONE unknown market costs one row, not the whole list", () => {
    // The regression. Previously this threw and the caller returned nothing.
    const rows = [
      { m: "WBTC-USDT", id: "1" },
      { m: "wstETH-WETH", id: "2" }, // e.g. a pair added after markets were cached
      { m: "WETH-USDT", id: "3" },
    ];
    const split = splitByKnownMarket(rows, MARKETS);
    expect(split.known.map((r) => r.id)).toEqual(["1", "3"]);
    expect(split.unknown.map((r) => r.id)).toEqual(["2"]);
    expect(split.unknownMarketIds).toEqual(["wstETH-WETH"]);
  });

  it("treats a row with no market id as unknown rather than mapping it", () => {
    // mapApiOrderToOrder would throw on these too, so they must not reach it.
    const rows = [{ m: "", id: "1" }, { m: null, id: "2" }, { id: "3" }];
    const split = splitByKnownMarket(rows, MARKETS);
    expect(split.known).toHaveLength(0);
    expect(split.unknown).toHaveLength(3);
    // No junk ids in the warning.
    expect(split.unknownMarketIds).toEqual([]);
  });

  it("returns everything as unknown when the market list is empty", () => {
    // Happens if init() ran before markets were available. Every row is
    // unmappable - but the call must still resolve, not reject.
    const rows = [{ m: "WBTC-USDT", id: "1" }];
    expect(splitByKnownMarket(rows, []).unknown).toHaveLength(1);
    expect(splitByKnownMarket(rows, null).unknown).toHaveLength(1);
    expect(splitByKnownMarket(rows, undefined).unknown).toHaveLength(1);
  });

  it("handles empty and missing input without throwing", () => {
    for (const input of [[], null, undefined]) {
      const split = splitByKnownMarket(input, MARKETS);
      expect(split.known).toEqual([]);
      expect(split.unknown).toEqual([]);
      expect(split.unknownMarketIds).toEqual([]);
    }
  });

  it("deduplicates unknown market ids for the warning", () => {
    const rows = [
      { m: "GHOST-A", id: "1" },
      { m: "GHOST-A", id: "2" },
      { m: "GHOST-B", id: "3" },
    ];
    const split = splitByKnownMarket(rows, MARKETS);
    expect(split.unknown).toHaveLength(3);
    expect(split.unknownMarketIds.sort()).toEqual(["GHOST-A", "GHOST-B"]);
  });

  it("never loses a row - known plus unknown always equals the input", () => {
    const rows = [
      { m: "WBTC-USDT", id: "1" },
      { m: "GHOST", id: "2" },
      { m: "", id: "3" },
      { m: "WETH-USDT", id: "4" },
    ];
    const split = splitByKnownMarket(rows, MARKETS);
    expect(split.known.length + split.unknown.length).toBe(rows.length);
  });
});

describe("describeSkippedMarkets", () => {
  it("is null when nothing was skipped, so nothing is logged", () => {
    const split = splitByKnownMarket([{ m: "WBTC-USDT" }], MARKETS);
    expect(describeSkippedMarkets(split, "getOpenOrders")).toBeNull();
  });

  it("names the count, the ids and the context", () => {
    const split = splitByKnownMarket(
      [{ m: "WBTC-USDT" }, { m: "GHOST" }],
      MARKETS
    );
    const msg = describeSkippedMarkets(split, "getOpenOrders") ?? "";
    expect(msg).toContain("getOpenOrders");
    expect(msg).toContain("GHOST");
    expect(msg).toContain("skipped 1");
    expect(msg).toContain("remaining 1");
  });

  it("still explains itself when the skipped rows had no market id", () => {
    const split = splitByKnownMarket([{ m: "" }], MARKETS);
    const msg = describeSkippedMarkets(split, "getOpenOrders") ?? "";
    expect(msg).toContain("no market id");
  });
});
