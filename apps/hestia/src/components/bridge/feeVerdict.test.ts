import {
  blocksSubmission,
  describeFee,
  describeFeeSource,
  feeVerdict,
} from "./feeVerdict";

/*
 * Ground truth: bridging 20 USDC from Sepolia to Polkadex showed
 *
 *   Estimated fee            Ø
 *   (!) Insufficient balance to pay the transaction fee at source chain
 *
 * and the user asked, reasonably: which currency, how much, from which account?
 * The fee is Sepolia ETH gas - a different asset from the USDC being bridged -
 * and nothing on the dialog said so.
 */

const base = {
  feeTicker: "ETH",
  balanceTicker: "ETH",
  existential: 0,
};

describe("feeVerdict - refusing to guess", () => {
  it("says UNKNOWN, not insufficient, when the fee has not been estimated", () => {
    // THE bug: `balance <= fee + existential` with both defaulting to 0 is
    // 0 <= 0, which is true, so a missing estimate accused the user of being
    // short of funds.
    const v = feeVerdict({ ...base, feeAmount: null, balanceAmount: 0 });
    expect(v.status).toBe("unknown");
    expect(blocksSubmission(v)).toBe(false);
  });

  it("says UNKNOWN when the balance could not be read", () => {
    const v = feeVerdict({ ...base, feeAmount: 0.002, balanceAmount: null });
    expect(v.status).toBe("unknown");
    if (v.status !== "unknown") throw new Error("unreachable");
    expect(v.reason).toContain("ETH");
  });

  it("reports estimating separately from unknown", () => {
    const v = feeVerdict({
      ...base,
      feeAmount: null,
      balanceAmount: 1,
      estimating: true,
    });
    expect(v.status).toBe("estimating");
    expect(blocksSubmission(v)).toBe(false);
  });

  it("surfaces the estimator's own error rather than swallowing it", () => {
    const v = feeVerdict({
      ...base,
      feeAmount: null,
      balanceAmount: 1,
      estimateError: "quote reverted",
    });
    expect(v.status).toBe("unknown");
    if (v.status !== "unknown") throw new Error("unreachable");
    expect(v.reason).toBe("quote reverted");
  });
});

describe("feeVerdict - the arithmetic", () => {
  it("passes when the balance covers fee plus reserve", () => {
    const v = feeVerdict({
      ...base,
      feeAmount: 0.002,
      balanceAmount: 0.01,
      existential: 0.001,
    });
    expect(v.status).toBe("ok");
    if (v.status !== "ok") throw new Error("unreachable");
    expect(v.remaining).toBeCloseTo(0.007, 10);
    expect(blocksSubmission(v)).toBe(false);
  });

  it("reports the SHORTFALL, not just the fact of being short", () => {
    const v = feeVerdict({ ...base, feeAmount: 0.005, balanceAmount: 0.002 });
    expect(v.status).toBe("insufficient");
    if (v.status !== "insufficient") throw new Error("unreachable");
    expect(v.shortfall).toBeCloseTo(0.003, 10);
    expect(blocksSubmission(v)).toBe(true);
  });

  it("treats exactly-enough as enough", () => {
    // The old check was `balance <= fee + existential`, so a balance exactly
    // equal to the fee was rejected. Paying a fee you can exactly afford works.
    expect(
      feeVerdict({ ...base, feeAmount: 0.002, balanceAmount: 0.002 }).status
    ).toBe("ok");
  });

  it("counts the existential reserve as required, not optional", () => {
    const v = feeVerdict({
      ...base,
      feeAmount: 0.002,
      balanceAmount: 0.0025,
      existential: 0.001,
    });
    expect(v.status).toBe("insufficient");
  });

  it("catches a fee quoted in a different currency from the balance", () => {
    const v = feeVerdict({
      feeAmount: 1,
      feeTicker: "DAI",
      balanceAmount: 5,
      balanceTicker: "ETH",
    });
    expect(v.status).toBe("mismatch");
    expect(blocksSubmission(v)).toBe(true);
  });

  it("accepts a genuinely free transfer", () => {
    const v = feeVerdict({ ...base, feeAmount: 0, balanceAmount: 0 });
    expect(v.status).toBe("ok");
  });
});

describe("what the user actually reads", () => {
  it("names the currency even when the amount is unknown", () => {
    // This alone answers "what currency is required for paying the fee", which
    // the old dialog never did - it blanked the ticker whenever it printed Ø.
    const v = feeVerdict({ ...base, feeAmount: null, balanceAmount: 1 });
    expect(describeFee(v, "ETH")).toContain("ETH");
    expect(describeFee(v, "ETH")).not.toContain("Ø");
  });

  it("never renders the empty-set glyph, in any state", () => {
    const states = [
      feeVerdict({ ...base, feeAmount: null, balanceAmount: 1 }),
      feeVerdict({ ...base, feeAmount: 0, balanceAmount: 1 }),
      feeVerdict({ ...base, feeAmount: 0.002, balanceAmount: 0.0001 }),
      feeVerdict({
        ...base,
        feeAmount: null,
        balanceAmount: 1,
        estimating: true,
      }),
    ];
    for (const s of states) expect(describeFee(s, "ETH")).not.toContain("Ø");
  });

  it("tells the user how much more, in what, and where from", () => {
    const v = feeVerdict({ ...base, feeAmount: 0.005, balanceAmount: 0.002 });
    const text = describeFeeSource(v, "Talisman 0xd1...8CDD") ?? "";
    expect(text).toContain("0.003");
    expect(text).toContain("ETH");
    expect(text).toContain("Talisman 0xd1...8CDD");
    // The point the reported case missed: the fee is not paid in the bridged asset.
    expect(text).toContain("not in the asset being bridged");
  });

  it("does not print a fee in exponential notation", () => {
    // String(0.0000021) is "2.1e-6"; gas fees live in this range.
    const v = feeVerdict({ ...base, feeAmount: 0.0000021, balanceAmount: 1 });
    expect(describeFee(v, "ETH")).not.toContain("e-");
  });

  it("says nothing extra while estimating", () => {
    const v = feeVerdict({
      ...base,
      feeAmount: null,
      balanceAmount: 1,
      estimating: true,
    });
    expect(describeFeeSource(v, "acct")).toBeNull();
  });

  it("warns loudly on a currency mismatch instead of quietly blocking", () => {
    const v = feeVerdict({
      feeAmount: 1,
      feeTicker: "DAI",
      balanceAmount: 5,
      balanceTicker: "ETH",
    });
    expect(describeFeeSource(v)).toContain("do not submit");
  });
});
