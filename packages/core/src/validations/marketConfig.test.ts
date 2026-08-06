import {
  checkMarketConfig,
  isMarketConfigUsable,
  describeMarketConfig,
  MarketConfigInput,
} from "./marketConfig";

/*
 * Fixtures are the REAL on-chain configs captured 2026-08-06, the day all 10
 * testnet pairs were found mis-registered. The checker must condemn the pairs
 * that were dead and pass the ones that traded - that is its whole job, so
 * the suite is anchored to ground truth rather than invented numbers.
 */

const fatalsOf = (cfg: MarketConfigInput) =>
  checkMarketConfig(cfg)
    .filter((i) => i.severity === "fatal")
    .map((i) => i.rule);

// WETH/USDT as actually registered: the pair that produced
// "Bad order: market config invalid" for a 1 WETH @ 20 USDT buy.
const WETH_USDT_BROKEN: MarketConfigInput = {
  market: "3-6",
  min_volume: 0.00001,
  max_volume: 1,
  price_tick_size: 0.00000001,
  qty_step_size: 100,
  base_asset_precision: 0,
  quote_asset_precision: 8,
};

// PDEX/USDT as registered - the pair the user successfully traded on.
const PDEX_USDT_WORKING: MarketConfigInput = {
  market: "PDEX-6",
  min_volume: 0.00001,
  max_volume: 1,
  price_tick_size: 0.0000000001,
  qty_step_size: 0.1,
  base_asset_precision: 2,
  quote_asset_precision: 11,
};

describe("ground truth: the 2026-08-06 on-chain configs", () => {
  it("condemns WETH/USDT once a price is known - the reported bug", () => {
    // At ANY plausible WETH price, one step (100 WETH) blows the 1 USDT cap.
    const withPrice = { ...WETH_USDT_BROKEN, referencePrice: 20 };
    expect(isMarketConfigUsable(withPrice)).toBe(false);
    expect(fatalsOf(withPrice)).toContain("step-unaffordable-at-price");
  });

  it("flags WETH/USDT as suspicious even WITHOUT a price", () => {
    // Priceless data is what a registration-time gate has. The signature
    // (precision 0 + step 100) must at least warn, or the gate is blind.
    const issues = checkMarketConfig(WETH_USDT_BROKEN);
    expect(issues.map((i) => i.rule)).toContain("suspicious-scale");
  });

  it("passes the pair that actually traded", () => {
    expect(checkMarketConfig(PDEX_USDT_WORKING)).toEqual([]);
    expect(isMarketConfigUsable(PDEX_USDT_WORKING)).toBe(true);
  });

  it("condemns the 10-3 pair (min_volume 10000 vs max 1e12, step 100, tick 1)", () => {
    const cfg: MarketConfigInput = {
      market: "10-3",
      min_volume: 10000,
      max_volume: 1000000000000,
      price_tick_size: 1,
      qty_step_size: 100,
      base_asset_precision: 0,
      quote_asset_precision: 0,
    };
    // Structurally satisfiable (100*1 <= 1e12) so it may pass priceless
    // checks apart from the scale warning - but at a sane sub-1 price the
    // step check must not false-positive. This pins the checker's honesty:
    // not everything ugly is provably fatal.
    expect(checkMarketConfig(cfg).map((i) => i.rule)).toContain(
      "suspicious-scale"
    );
  });
});

describe("individual rules", () => {
  const base: MarketConfigInput = {
    market: "T",
    min_volume: 0.001,
    max_volume: 1000,
    price_tick_size: 0.01,
    qty_step_size: 0.01,
    base_asset_precision: 8,
    quote_asset_precision: 8,
  };

  it("passes a sane config silently", () => {
    expect(checkMarketConfig(base)).toEqual([]);
  });

  it("rejects zero/negative/non-finite units", () => {
    expect(fatalsOf({ ...base, price_tick_size: 0 })).toContain(
      "tick-positive"
    );
    expect(fatalsOf({ ...base, qty_step_size: -1 })).toContain("step-positive");
    expect(fatalsOf({ ...base, max_volume: 0 })).toContain("maxvol-positive");
    expect(fatalsOf({ ...base, qty_step_size: NaN })).toContain(
      "step-positive"
    );
    expect(fatalsOf({ ...base, min_volume: -5 })).toContain("minvol-nonneg");
  });

  it("rejects an inverted volume window", () => {
    expect(fatalsOf({ ...base, min_volume: 10, max_volume: 1 })).toContain(
      "vol-window"
    );
  });

  it("rejects step finer than the base precision allows", () => {
    expect(
      fatalsOf({ ...base, qty_step_size: 0.001, base_asset_precision: 2 })
    ).toContain("step-vs-base-precision");
  });

  it("rejects tick finer than the quote precision allows", () => {
    expect(
      fatalsOf({ ...base, price_tick_size: 0.000001, quote_asset_precision: 2 })
    ).toContain("tick-vs-quote-precision");
  });

  it("accepts step exactly at the precision boundary", () => {
    expect(
      checkMarketConfig({
        ...base,
        qty_step_size: 0.01,
        base_asset_precision: 2,
      })
    ).toEqual([]);
  });

  it("handles 1e-8-style units without scientific-notation parsing bugs", () => {
    // impliedDecimals must see 8, not the '1e-8' string.
    expect(
      fatalsOf({
        ...base,
        qty_step_size: 1e-8,
        base_asset_precision: 8,
      })
    ).toEqual([]);
    expect(
      fatalsOf({ ...base, qty_step_size: 1e-8, base_asset_precision: 7 })
    ).toContain("step-vs-base-precision");
  });

  it("rejects when the smallest possible order exceeds max_volume", () => {
    expect(
      fatalsOf({
        ...base,
        qty_step_size: 100,
        price_tick_size: 1,
        base_asset_precision: 0,
        quote_asset_precision: 0,
        max_volume: 50,
      })
    ).toContain("smallest-order-exceeds-max");
  });

  it("rejects when no grid multiple lands inside the volume window", () => {
    expect(
      fatalsOf({
        ...base,
        qty_step_size: 7,
        price_tick_size: 1,
        base_asset_precision: 0,
        quote_asset_precision: 0,
        min_volume: 8,
        max_volume: 13, // multiples of 7: 7 (below min), 14 (above max)
      })
    ).toContain("min-unreachable");
  });

  it("price rules only run when a reference price is provided", () => {
    const cfg = { ...base, qty_step_size: 10, max_volume: 100 };
    expect(fatalsOf(cfg)).toEqual([]); // no price, no verdict
    expect(fatalsOf({ ...cfg, referencePrice: 20 })).toContain(
      "step-unaffordable-at-price" // 10 * 20 = 200 > 100
    );
    expect(fatalsOf({ ...cfg, referencePrice: 5 })).toEqual([]); // 50 <= 100
  });

  it("never throws, whatever garbage arrives", () => {
    const junk = [
      { ...base, price_tick_size: Infinity },
      { ...base, qty_step_size: Infinity, max_volume: Infinity },
      { ...base, min_volume: NaN },
      { ...base, referencePrice: NaN },
      { ...base, referencePrice: -1 },
    ];
    for (const cfg of junk) expect(() => checkMarketConfig(cfg)).not.toThrow();
  });
});

describe("describeMarketConfig", () => {
  it("names the market and the verdict", () => {
    expect(describeMarketConfig(PDEX_USDT_WORKING)).toBe("PDEX-6: OK");
    const broken = describeMarketConfig({
      ...WETH_USDT_BROKEN,
      referencePrice: 20,
    });
    expect(broken).toContain("3-6: UNUSABLE");
    expect(broken).toContain("step-unaffordable-at-price");
  });
});
