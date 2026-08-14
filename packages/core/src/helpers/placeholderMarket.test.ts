import {
  UNKNOWN_TICKER,
  isPlaceholderMarket,
  placeholderMarket,
} from "./placeholderMarket";

/*
 * Jest globals, matching the rest of this package.
 *
 * The point of these tests is STRUCTURAL COMPLETENESS. The bug was not a wrong
 * value, it was a missing nested object: `{} as MarketBase` has no baseAsset, so
 * `market.baseAsset.ticker` threw. So the tests assert that every path the Orders
 * panel actually reads is present and readable, rather than checking a few fields.
 */

describe("placeholderMarket - the reported crash (ORDERBOOK-TESTNET-6)", () => {
  it("makes market.baseAsset.ticker readable, which is what threw", () => {
    // TypeError: undefined is not an object (evaluating 's.baseAsset.ticker')
    const m = placeholderMarket();
    expect(() => m.baseAsset.ticker).not.toThrow();
    expect(m.baseAsset.ticker).toBe(UNKNOWN_TICKER);
  });

  it("makes every path the Orders panel reads safe", () => {
    // These are the exact expressions grepped out of columns.tsx and
    // responsiveTable.tsx for OpenOrders, OrderHistory and TradeHistory.
    const m = placeholderMarket("123-456");
    expect(() => ({
      name: m.name,
      baseTicker: m.baseAsset.ticker,
      quoteTicker: m.quoteAsset.ticker,
      baseName: m.baseAsset.name,
      quoteName: m.quoteAsset.name,
      baseDecimal: m.baseAsset.decimal,
      quoteDecimal: m.quoteAsset.decimal,
      baseId: m.baseAsset.id,
      quoteId: m.quoteAsset.id,
    })).not.toThrow();
  });

  it("has no undefined at any level", () => {
    // A single undefined nested object is the whole bug, so assert exhaustively.
    const m = placeholderMarket();
    for (const [k, v] of Object.entries(m)) {
      expect({ key: k, defined: v !== undefined }).toEqual({
        key: k,
        defined: true,
      });
    }
    for (const asset of [m.baseAsset, m.quoteAsset]) {
      for (const [k, v] of Object.entries(asset)) {
        expect({ key: k, defined: v !== undefined }).toEqual({
          key: k,
          defined: true,
        });
      }
    }
  });
});

describe("placeholderMarket - what it says", () => {
  it("shows a dash rather than inventing a pair", () => {
    // Inventing "PDEX/USDT" would put a specific wrong pair beside a real
    // quantity on a screen people trade from.
    const m = placeholderMarket();
    expect(m.name).toBe(UNKNOWN_TICKER);
    expect(m.baseAsset.ticker).toBe(UNKNOWN_TICKER);
    expect(m.quoteAsset.ticker).toBe(UNKNOWN_TICKER);
    expect(m.baseAsset.ticker).not.toBe("PDEX");
  });

  it("preserves the market id so the row stays correlatable", () => {
    // Support needs to know WHICH market failed to resolve, not just that one did.
    expect(placeholderMarket("123-456").id).toBe("123-456");
  });

  it("normalises a missing or blank id to an empty string", () => {
    for (const v of [undefined, null, "", "   "]) {
      expect({ in: String(v), id: placeholderMarket(v).id }).toEqual({
        in: String(v),
        id: "",
      });
    }
  });

  it("uses decimal 0, so a placeholder can never silently scale an amount", () => {
    // 12 would look plausible and produce a 10^12 error if anything multiplied
    // by it. 0 yields 1x - visibly unscaled, therefore noticeable.
    const m = placeholderMarket();
    expect(m.baseAsset.decimal).toBe(0);
    expect(m.quoteAsset.decimal).toBe(0);
  });
});

describe("isPlaceholderMarket", () => {
  it("recognises its own output", () => {
    expect(isPlaceholderMarket(placeholderMarket())).toBe(true);
    expect(isPlaceholderMarket(placeholderMarket("1-2"))).toBe(true);
  });

  it("does not flag a real market", () => {
    expect(isPlaceholderMarket({ baseAsset: { ticker: "PDEX" } })).toBe(false);
  });

  it("survives the malformed shapes it exists to detect", () => {
    for (const v of [
      undefined,
      null,
      {},
      { baseAsset: null },
      { baseAsset: {} },
    ]) {
      expect(() => isPlaceholderMarket(v as never)).not.toThrow();
      expect(isPlaceholderMarket(v as never)).toBe(false);
    }
  });
});
