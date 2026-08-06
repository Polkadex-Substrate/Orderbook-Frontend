import { findFundingAmount, isStrandedInFunding } from "./balance.logic";

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
