import { matchTradingBalance } from "./matchTradingBalance";

/*
 * Ground truth: the order form showed the SAME dust figure (0.00000001) for
 * both sides of WETH/PDEX while the account held real balances. The old
 * predicate was:
 *
 *   balances.find((b) => { if (!b?.asset) return {}; return b.asset.id === id; })
 *
 * `{}` is truthy, so the first assetless entry matched every query.
 */

const pdex = { asset: { id: "PDEX" }, free: 12.5, reserved: 100 };
const weth = { asset: { id: "1" }, free: 0.4, reserved: 1 };
const orphan = { free: 0.00000001, reserved: 0 }; // engine row whose asset did not resolve

describe("matchTradingBalance", () => {
  it("returns the entry for the asked-for asset", () => {
    expect(matchTradingBalance([pdex, weth], "1")).toBe(weth);
    expect(matchTradingBalance([pdex, weth], "PDEX")).toBe(pdex);
  });

  it("THE bug: an assetless entry must not match every asset", () => {
    // With the old predicate both of these returned `orphan`, so PDEX and WETH
    // rendered the same number - exactly the reported symptom.
    expect(matchTradingBalance([orphan, pdex, weth], "PDEX")).toBe(pdex);
    expect(matchTradingBalance([orphan, pdex, weth], "1")).toBe(weth);
  });

  it("returns undefined rather than a plausible wrong entry", () => {
    // A zero prompts the user to investigate. A confident wrong number does not.
    expect(matchTradingBalance([orphan], "PDEX")).toBeUndefined();
    expect(matchTradingBalance([pdex], "does-not-exist")).toBeUndefined();
  });

  it("survives empty, null and undefined inputs", () => {
    expect(matchTradingBalance([], "PDEX")).toBeUndefined();
    expect(matchTradingBalance(null, "PDEX")).toBeUndefined();
    expect(matchTradingBalance(undefined, "PDEX")).toBeUndefined();
  });

  it("treats a missing asset id as no query, not as a wildcard", () => {
    // getFreeProxyBalance passes market?.quoteAsset?.id || "-1"; an undefined id
    // reaching here must not match the first entry.
    expect(matchTradingBalance([pdex, weth], undefined)).toBeUndefined();
    expect(matchTradingBalance([pdex, weth], "")).toBeUndefined();
  });

  it("does not match an entry whose asset exists but has no id", () => {
    const noId = { asset: {}, free: 5, reserved: 0 };
    expect(matchTradingBalance([noId, pdex], "PDEX")).toBe(pdex);
    expect(matchTradingBalance([noId], "PDEX")).toBeUndefined();
  });
});
