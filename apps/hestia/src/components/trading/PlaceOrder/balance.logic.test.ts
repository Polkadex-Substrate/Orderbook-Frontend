import {
  balanceBreakdown,
  findFundingAmount,
  isStrandedInFunding,
  numericChild,
} from "./balance.logic";

const rows = [
  { asset: { ticker: "USDT" }, onChainBalance: "100" },
  { asset: { ticker: "WBTC" }, onChainBalance: "0" },
  { asset: { ticker: "WETH" }, onChainBalance: 0.012 },
];

describe("findFundingAmount", () => {
  it("finds the funding amount by ticker", () => {
    expect(findFundingAmount(rows, "USDT")).toBe(100);
    expect(findFundingAmount(rows, "WETH")).toBeCloseTo(0.012, 12);
  });

  it("returns 0 for a ticker with nothing in funding", () => {
    expect(findFundingAmount(rows, "WBTC")).toBe(0);
  });

  it("returns 0 for an unknown ticker or empty input", () => {
    expect(findFundingAmount(rows, "PDEX")).toBe(0);
    expect(findFundingAmount([], "USDT")).toBe(0);
    expect(findFundingAmount(null, "USDT")).toBe(0);
    expect(findFundingAmount(undefined, "USDT")).toBe(0);
    expect(findFundingAmount(rows, "")).toBe(0);
  });

  it("never returns NaN, whatever the row contains", () => {
    // A NaN here would render as "NaN USDT in Funding", which is worse than
    // showing nothing at all.
    const junk = [
      { asset: { ticker: "X" }, onChainBalance: "not-a-number" },
      { asset: { ticker: "Y" }, onChainBalance: null },
      { asset: { ticker: "Z" }, onChainBalance: undefined },
      { asset: null, onChainBalance: "5" },
      {},
    ];
    for (const t of ["X", "Y", "Z", "W"]) {
      const v = findFundingAmount(junk, t);
      expect(Number.isNaN(v)).toBe(false);
      expect(v).toBe(0);
    }
  });

  it("ignores a negative funding value rather than displaying it", () => {
    expect(
      findFundingAmount([{ asset: { ticker: "A" }, onChainBalance: "-5" }], "A")
    ).toBe(0);
  });

  it("handles the small balances that broke display before", () => {
    // Sub-1e-8 values were previously truncated to exactly "0" elsewhere in the
    // app; this must still report them as present so the hint appears.
    expect(
      findFundingAmount(
        [{ asset: { ticker: "A" }, onChainBalance: "0.000000001" }],
        "A"
      )
    ).toBeCloseTo(1e-9, 15);
  });
});

describe("numericChild", () => {
  it("recognises the dust values that render exponentially", () => {
    // THE bug: the form displayed "1e-8 PDEX Available" because React
    // stringified the raw number. These must be recognised as numbers so the
    // caller formats them instead of rendering them.
    expect(numericChild(1e-8)).toBe(1e-8);
    expect(numericChild(0.00000001)).toBe(1e-8);
    expect(numericChild(1e-12)).toBe(1e-12);
  });

  it("passes ordinary numbers through", () => {
    expect(numericChild(0)).toBe(0);
    expect(numericChild(100)).toBe(100);
    expect(numericChild(1234.5678)).toBeCloseTo(1234.5678, 10);
  });

  it("parses numeric strings, including exponential ones", () => {
    // If an upstream component has already stringified the value, "1e-8" must
    // still be recognised rather than passed through and displayed raw.
    expect(numericChild("1e-8")).toBe(1e-8);
    expect(numericChild("0.5")).toBe(0.5);
    expect(numericChild("  42  ")).toBe(42);
  });

  it("returns null for non-numeric children so they pass through untouched", () => {
    // A skeleton element or a dash must not become "0".
    expect(numericChild("-")).toBeNull();
    expect(numericChild("")).toBeNull();
    expect(numericChild("   ")).toBeNull();
    expect(numericChild(null)).toBeNull();
    expect(numericChild(undefined)).toBeNull();
    expect(numericChild({})).toBeNull();
    expect(numericChild(["1"])).toBeNull();
    expect(numericChild(true)).toBeNull();
  });

  it("returns null for non-finite numbers rather than rendering Infinity", () => {
    expect(numericChild(NaN)).toBeNull();
    expect(numericChild(Infinity)).toBeNull();
    expect(numericChild(-Infinity)).toBeNull();
    expect(numericChild("NaN")).toBeNull();
  });

  it("distinguishes zero from absent - both are falsy but mean different things", () => {
    expect(numericChild(0)).toBe(0);
    expect(numericChild("")).toBeNull();
  });
});

describe("isStrandedInFunding", () => {
  it("is true only when trading is empty and funding is not", () => {
    // The reported case: 0 available to trade, 100 sitting in funding.
    expect(isStrandedInFunding(0, 100)).toBe(true);
  });

  it("is false when the user can already trade", () => {
    expect(isStrandedInFunding(10, 100)).toBe(false);
    expect(isStrandedInFunding(0.00000001, 100)).toBe(false);
  });

  it("is false when there is nothing anywhere", () => {
    // Otherwise a brand new account is told to transfer funds it does not have.
    expect(isStrandedInFunding(0, 0)).toBe(false);
  });

  it("is false for non-finite inputs on EITHER side", () => {
    expect(isStrandedInFunding(NaN, 100)).toBe(false);
    expect(isStrandedInFunding(0, NaN)).toBe(false);
    // Infinity is not finite, so it is rejected like NaN. An infinite funding
    // balance means the data is wrong, and prompting a transfer of it is worse
    // than staying quiet.
    expect(isStrandedInFunding(0, Infinity)).toBe(false);
    expect(isStrandedInFunding(0, -Infinity)).toBe(false);
    expect(isStrandedInFunding(Infinity, 100)).toBe(false);
    expect(isStrandedInFunding(-Infinity, 100)).toBe(false);
  });

  it("treats a negative trading balance as empty", () => {
    expect(isStrandedInFunding(-1, 100)).toBe(true);
  });

  it("composes with findFundingAmount end to end", () => {
    // The exact scenario from the screenshot: WBTC/USDT market, quote is USDT.
    const trading = 0;
    const funding = findFundingAmount(rows, "USDT");
    expect(isStrandedInFunding(trading, funding)).toBe(true);

    // And the WBTC side, where funding is also empty, must stay quiet.
    expect(isStrandedInFunding(0, findFundingAmount(rows, "WBTC"))).toBe(false);
  });
});

describe("balanceBreakdown", () => {
  /*
   * Ground truth: the WETH/PDEX form showed "0.00000001 PDEX Available" while
   * the account held real PDEX - 7 resting orders had it reserved, and more sat
   * in funding. Neither subtraction was named anywhere on screen, so the only
   * available reading was that the balance was broken.
   */
  const rows = [
    {
      asset: { ticker: "PDEX" },
      free: 0.00000001,
      reserved: 200,
      onChainBalance: "50",
    },
    { asset: { ticker: "WETH" }, free: 2, reserved: 0, onChainBalance: "0" },
  ];

  it("headlines everything the user owns, across both accounts", () => {
    const p = balanceBreakdown(rows, "PDEX");
    expect(p.total).toBeCloseTo(250.00000001, 8);
    expect(p.tradable).toBeCloseTo(0.00000001, 8);
    expect(p.reserved).toBe(200);
    expect(p.funding).toBe(50);
    expect(p.allTradable).toBe(false);
  });

  it("says nothing extra when the whole holding is already spendable", () => {
    // The common case must stay one clean line - no encumbrance text, no hint.
    const p = balanceBreakdown(rows, "WETH");
    expect(p.total).toBe(2);
    expect(p.allTradable).toBe(true);
  });

  it("prefers the form's own tradable figure over the raw row", () => {
    // The form validates against the value it passes in (post-toHuman). If the
    // headline disagreed with that, the user could be told they hold enough and
    // then be rejected on submit.
    const p = balanceBreakdown(rows, "PDEX", 0.5);
    expect(p.tradable).toBe(0.5);
    expect(p.total).toBeCloseTo(250.5, 8);
  });

  it("treats an explicit null override as 'not supplied', not as zero", () => {
    // numericChild returns null for a non-numeric child (a loading skeleton).
    // That must fall back to the row, not wipe the tradable figure.
    const p = balanceBreakdown(rows, "PDEX", null);
    expect(p.tradable).toBeCloseTo(0.00000001, 8);
  });

  it("never produces NaN from junk, and never a negative slice", () => {
    const junk = [
      {
        asset: { ticker: "X" },
        free: Number.NaN,
        reserved: -5,
        onChainBalance: "not-a-number",
      },
    ];
    const p = balanceBreakdown(junk, "X");
    expect(p.total).toBe(0);
    expect(p.tradable).toBe(0);
    expect(p.reserved).toBe(0);
    expect(p.funding).toBe(0);
    expect(p.allTradable).toBe(true);
  });

  it("returns zeros rather than another asset's balance for an unknown ticker", () => {
    const p = balanceBreakdown(rows, "NOPE");
    expect(p.total).toBe(0);
    expect(balanceBreakdown(rows, "").total).toBe(0);
    expect(balanceBreakdown(null, "PDEX").total).toBe(0);
    expect(balanceBreakdown(undefined, "PDEX").total).toBe(0);
  });

  it("counts reserved even when nothing is tradable - the reported screen", () => {
    // All funds locked in resting orders, nothing in funding. Total must still
    // show the holding rather than a near-zero that reads as lost money.
    const allLocked = [
      {
        asset: { ticker: "PDEX" },
        free: 0,
        reserved: 100,
        onChainBalance: "0",
      },
    ];
    const p = balanceBreakdown(allLocked, "PDEX");
    expect(p.total).toBe(100);
    expect(p.tradable).toBe(0);
    expect(p.allTradable).toBe(false);
  });
});
