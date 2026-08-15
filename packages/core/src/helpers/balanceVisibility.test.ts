import {
  DUST_THRESHOLD,
  isEmptyBalance,
  shouldShowAsset,
  totalHeld,
} from "./balanceVisibility";

/*
 * Jest globals, matching the rest of this package.
 *
 * The failing case is taken from the screenshot that prompted the change: PDEX
 * with 100 in the FUNDING account and 0 in trading. The old predicate checked
 * `free_balance` only, so that row was classified as empty. Defaulting the
 * toggle on would have hidden the only asset the user held.
 */

/** The row from the report: held entirely in the funding account. */
const FUNDING_ONLY = {
  onChainBalance: "100",
  free_balance: "0",
  inOrdersBalance: "0",
};

const NOTHING = {
  onChainBalance: "0",
  free_balance: "0",
  inOrdersBalance: "0",
};

describe("the reported bug: funds in the funding account are still funds", () => {
  it("does not treat a funding-only balance as empty", () => {
    // The exact row from the screenshot. The old rule looked at free_balance
    // alone and would have hidden this.
    expect(isEmptyBalance(FUNDING_ONLY)).toBe(false);
    expect(shouldShowAsset(FUNDING_ONLY, true, false)).toBe(true);
  });

  it("counts each of the three columns on its own", () => {
    // Funding, trading and in-orders each independently mean "you hold this".
    const cases = [
      ["onChainBalance", { ...NOTHING, onChainBalance: "5" }],
      ["free_balance", { ...NOTHING, free_balance: "5" }],
      ["inOrdersBalance", { ...NOTHING, inOrdersBalance: "5" }],
    ] as const;
    for (const [field, balance] of cases) {
      expect({ field, empty: isEmptyBalance(balance) }).toEqual({
        field,
        empty: false,
      });
    }
  });

  it("counts funds committed to open orders", () => {
    // Committed, not spent. An asset vanishing because all of it is working in
    // the book is alarming in exactly the wrong way.
    expect(isEmptyBalance({ ...NOTHING, inOrdersBalance: "42" })).toBe(false);
  });

  it("still hides a genuinely empty row", () => {
    expect(isEmptyBalance(NOTHING)).toBe(true);
    expect(shouldShowAsset(NOTHING, true, false)).toBe(false);
  });
});

describe("totalHeld", () => {
  it("sums the three balances", () => {
    expect(
      totalHeld({
        onChainBalance: "1",
        free_balance: "2",
        inOrdersBalance: "3",
      })
    ).toBe(6);
  });

  it("treats missing, empty and unparseable fields as zero", () => {
    for (const v of [undefined, null, "", "abc", NaN]) {
      expect({
        v: String(v),
        t: totalHeld({ onChainBalance: v as never }),
      }).toEqual({ v: String(v), t: 0 });
    }
  });

  it("survives a missing balance object", () => {
    expect(totalHeld(undefined)).toBe(0);
    expect(totalHeld(null)).toBe(0);
    expect(() => isEmptyBalance(null)).not.toThrow();
  });

  it("accepts numbers as well as strings", () => {
    expect(totalHeld({ onChainBalance: 1.5, free_balance: 0.5 })).toBe(2);
  });
});

describe("the dust threshold", () => {
  it("hides an amount below the threshold", () => {
    expect(isEmptyBalance({ onChainBalance: String(DUST_THRESHOLD / 2) })).toBe(
      true
    );
  });

  it("shows an amount at or above it", () => {
    expect(isEmptyBalance({ onChainBalance: String(DUST_THRESHOLD) })).toBe(
      false
    );
  });

  it("applies to the TOTAL, not to each column", () => {
    // Three dust amounts that individually round to nothing but together are a
    // real balance. Testing each column separately would hide this row.
    const third = DUST_THRESHOLD / 3 + 0.0001;
    expect(
      isEmptyBalance({
        onChainBalance: String(third),
        free_balance: String(third),
        inOrdersBalance: String(third),
      })
    ).toBe(false);
  });
});

describe("shouldShowAsset - the toggle and the search box", () => {
  it("shows everything when the toggle is off", () => {
    expect(shouldShowAsset(NOTHING, false, false)).toBe(true);
  });

  it("lets a search override the toggle", () => {
    // Typing "USDC" and getting an empty list reads as "this asset does not
    // exist", not "a checkbox elsewhere is hiding it". An explicit request
    // beats a standing preference.
    expect(shouldShowAsset(NOTHING, true, true)).toBe(true);
  });

  it("hides an empty row only when the toggle is on and no search is active", () => {
    expect(shouldShowAsset(NOTHING, true, false)).toBe(false);
  });
});
