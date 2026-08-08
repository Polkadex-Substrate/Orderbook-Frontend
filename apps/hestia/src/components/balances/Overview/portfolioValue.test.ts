import { holdingTotal, portfolioValue } from "./portfolioValue";

/*
 * Ground truth, from the Balances page on 2026-08-07: the header read
 * "Total assets in BTC / 0.00000000 = $0.00" while the account held 177.99 USDT
 * (plus 0.999 trading, 20 in orders), 109.7304 PDEX, 99 LINK, 50 UNI, 9 AAVE
 * and 0.7889 WETH. The zero was hardcoded, not computed.
 */

const rows = [
  {
    asset: { ticker: "USDT" },
    free: 0.999,
    reserved: 20,
    onChainBalance: "177.99",
  },
  {
    asset: { ticker: "PDEX" },
    free: 0.00000001,
    reserved: 200,
    onChainBalance: "109.7304",
  },
  { asset: { ticker: "LINK" }, free: 1, reserved: 0, onChainBalance: "99" },
  { asset: { ticker: "PWETH" }, free: 0, reserved: 0, onChainBalance: "0" },
];

describe("holdingTotal", () => {
  it("counts trading, reserved and funding as one holding", () => {
    expect(holdingTotal(rows[0])).toBeCloseTo(198.989, 6);
  });

  it("is zero for an empty row and never NaN for a junk one", () => {
    expect(holdingTotal({ asset: { ticker: "X" } })).toBe(0);
    expect(
      holdingTotal({
        asset: { ticker: "X" },
        free: Number.NaN,
        reserved: -3,
        onChainBalance: "nope",
      })
    ).toBe(0);
  });
});

describe("portfolioValue", () => {
  it("reports UNAVAILABLE rather than zero when nothing can be priced", () => {
    // THE bug. On testnet every ticker's last price is 0/absent. The old code
    // rendered "$0.00", which is indistinguishable from a working valuation
    // telling the user their holdings are worthless.
    const v = portfolioValue(rows, () => null);
    expect(v.status).toBe("unavailable");
    expect(v.pricedCount).toBe(0);
    expect(v).not.toHaveProperty("total");
  });

  it("values holdings across all three buckets when prices exist", () => {
    const v = portfolioValue([rows[0]], () => 1);
    expect(v.status).toBe("complete");
    if (v.status === "unavailable") throw new Error("unreachable");
    expect(v.total).toBeCloseTo(198.989, 6);
  });

  it("flags a partial valuation instead of passing it off as the total", () => {
    // A total that silently omits assets is a wrong number wearing a right
    // number's clothes.
    const v = portfolioValue(rows, (t) => (t === "LINK" ? 2 : null));
    expect(v.status).toBe("partial");
    if (v.status === "unavailable") throw new Error("unreachable");
    expect(v.total).toBe(200);
    expect(v.unpricedTickers).toEqual(["USDT", "PDEX"]);
  });

  it("does not count a zero holding as unpriced", () => {
    // PWETH is 0/0/0. Listing it would make a complete valuation look partial
    // and nag about an asset the user does not own.
    const v = portfolioValue(rows, (t) => (t === "PWETH" ? null : 1));
    expect(v.status).toBe("complete");
    expect(v.unpricedTickers).toEqual([]);
  });

  it("treats a non-finite price as no price, not as zero", () => {
    expect(portfolioValue([rows[0]], () => Number.NaN).status).toBe(
      "unavailable"
    );
    expect(portfolioValue([rows[0]], () => Infinity).status).toBe(
      "unavailable"
    );
  });

  it("accepts a genuine zero price as a real price", () => {
    // Distinct from "unknown": an asset that really is worth 0 has been priced.
    const v = portfolioValue([rows[0]], () => 0);
    expect(v.status).toBe("complete");
    if (v.status === "unavailable") throw new Error("unreachable");
    expect(v.total).toBe(0);
  });

  it("survives empty, null and undefined inputs", () => {
    expect(portfolioValue([], () => 1).status).toBe("unavailable");
    expect(portfolioValue(null, () => 1).status).toBe("unavailable");
    expect(portfolioValue(undefined, () => 1).status).toBe("unavailable");
  });

  it("skips rows with no ticker rather than throwing", () => {
    const v = portfolioValue(
      [{ free: 5 }, { asset: null, free: 5 }, rows[2]],
      () => 1
    );
    expect(v.status).toBe("complete");
    if (v.status === "unavailable") throw new Error("unreachable");
    expect(v.total).toBe(100);
  });
});
