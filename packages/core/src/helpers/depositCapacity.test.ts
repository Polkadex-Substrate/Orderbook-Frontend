import {
  canDeposit,
  depositBlockMessage,
  depositBlockReason,
  maxDepositable,
} from "./depositCapacity";

/*
 * Jest globals, matching the rest of this package.
 *
 * THE CASE FROM THE REPORT comes first and is pinned by value: a new user whose
 * whole balance is one 1 PDEX faucet drip, with the real quoted fee from the
 * screenshot (0.0128). They must be told the truth - that nothing can be
 * deposited and why - not "your balance is not enough to pay the fee", which
 * was false.
 */

/** Ybug #3, verbatim: first faucet drip, real quoted fee. */
const FAUCET_USER = {
  balance: 1,
  fee: 0.0128,
  existential: 1,
  isFeeAsset: true,
};

describe("the reported case: one faucet drip, nothing can move", () => {
  it("computes zero capacity, not a negative number", () => {
    expect(maxDepositable(FAUCET_USER)).toBe(0);
  });

  it("names the existential floor, not the fee", () => {
    const reason = depositBlockReason(0.5, FAUCET_USER);
    expect(reason.kind).toBe("below-existential-floor");
  });

  it("tells the user how much more they need, precisely", () => {
    const reason = depositBlockReason(0.5, FAUCET_USER);
    if (reason.kind !== "below-existential-floor") {
      throw new Error("wrong branch");
    }
    expect(reason.shortfall).toBeCloseTo(0.0128, 10);
  });

  it("produces copy that never blames the fee", () => {
    const message = depositBlockMessage(
      depositBlockReason(0.5, FAUCET_USER),
      "PDEX"
    );
    // The exact failure of the old copy: the fee was NOT the problem.
    expect(message).not.toMatch(/not enough to pay the fee/i);
    expect(message).toMatch(/minimum balance/i);
    expect(message).toMatch(/PDEX/);
  });
});

describe("maxDepositable", () => {
  it("reserves fee + existential for the fee asset", () => {
    // 5 PDEX, fee 0.0128, keep 1: can move 3.9872.
    expect(
      maxDepositable({
        balance: 5,
        fee: 0.0128,
        existential: 1,
        isFeeAsset: true,
      })
    ).toBeCloseTo(3.9872, 10);
  });

  it("reserves only the existential for non-fee assets", () => {
    // Fees are paid in PDEX, so USDT competes only with its own tiny ED.
    expect(
      maxDepositable({
        balance: 100,
        fee: 0.0128,
        existential: 0.00000001,
        isFeeAsset: false,
      })
    ).toBeCloseTo(99.99999999, 8);
  });

  it("never returns a negative capacity", () => {
    expect(
      maxDepositable({
        balance: 0.5,
        fee: 0.0128,
        existential: 1,
        isFeeAsset: true,
      })
    ).toBe(0);
    expect(
      maxDepositable({ balance: 0, fee: 0, existential: 1, isFeeAsset: true })
    ).toBe(0);
  });

  it("treats junk inputs as zero rather than propagating NaN", () => {
    // NaN here would make every comparison false downstream, which reads as
    // "deposit allowed" - the dangerous direction.
    for (const bad of [NaN, -1, Infinity, undefined as unknown as number]) {
      expect(
        maxDepositable({
          balance: bad,
          fee: 0.01,
          existential: 1,
          isFeeAsset: true,
        })
      ).toBe(0);
    }
  });
});

describe("canDeposit - the single shared rule", () => {
  const HEALTHY = { balance: 5, fee: 0.0128, existential: 1, isFeeAsset: true };

  it("allows an amount inside capacity", () => {
    expect(canDeposit(3, HEALTHY)).toBe(true);
  });

  it("allows exactly the maximum", () => {
    expect(canDeposit(maxDepositable(HEALTHY), HEALTHY)).toBe(true);
  });

  it("rejects one step past the maximum", () => {
    expect(canDeposit(maxDepositable(HEALTHY) + 0.0001, HEALTHY)).toBe(false);
  });

  it("rejects zero and negatives", () => {
    expect(canDeposit(0, HEALTHY)).toBe(false);
    expect(canDeposit(-1, HEALTHY)).toBe(false);
  });
});

describe("depositBlockReason - remedies differ, so the kinds must too", () => {
  const HEALTHY = { balance: 5, fee: 0.0128, existential: 1, isFeeAsset: true };

  it("is ok inside capacity, and carries the max for the UI", () => {
    const reason = depositBlockReason(2, HEALTHY);
    expect(reason.kind).toBe("ok");
    expect(reason.max).toBeCloseTo(3.9872, 10);
  });

  it("is amount-too-high when typing less would fix it", () => {
    const reason = depositBlockReason(4.5, HEALTHY);
    expect(reason.kind).toBe("amount-too-high");
  });

  it("its copy tells the user the number that WOULD work", () => {
    const message = depositBlockMessage(
      depositBlockReason(4.5, HEALTHY),
      "PDEX"
    );
    expect(message).toContain("3.9872");
  });

  it("returns null copy when nothing is wrong", () => {
    expect(
      depositBlockMessage(depositBlockReason(2, HEALTHY), "PDEX")
    ).toBeNull();
  });
});
