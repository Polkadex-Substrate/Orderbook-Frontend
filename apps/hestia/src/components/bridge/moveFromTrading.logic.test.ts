import {
  COVER_EPSILON,
  ceil8,
  computeCoverableShortfall,
  withdrawalAmount,
  canResetOnClose,
  hasFundingArrived,
  totalFundingNeeded,
  hasGasForBridge,
} from "./moveFromTrading.logic";

/*
 * This logic decides whether user funds move between accounts and how much.
 * Every case here is either money-losing if wrong (over-withdrawal, double
 * withdrawal) or flow-breaking if wrong (offering a move that cannot succeed,
 * or dead-ending one that could).
 */

describe("computeCoverableShortfall", () => {
  const base = {
    isEvmSource: false,
    amountNeeded: 1,
    fundingBalance: 0.1,
    tradingFreeBalance: 5,
  };

  it("offers exactly the shortfall, never all of trading", () => {
    // The consent screen shows this number and the withdrawal uses this
    // number. 0.9 is what is missing - 5 is what COULD move, and moving it
    // would exceed what the user consented to.
    expect(computeCoverableShortfall(base)).toBeCloseTo(0.9, 12);
  });

  it("returns 0 when funding alone already covers the transfer", () => {
    expect(computeCoverableShortfall({ ...base, fundingBalance: 2 })).toBe(0);
    // Boundary: exactly enough funding needs no move.
    expect(computeCoverableShortfall({ ...base, fundingBalance: 1 })).toBe(0);
  });

  it("returns 0 when funding + trading still cannot cover it", () => {
    // A move that leaves the transfer blocked anyway must not be offered:
    // the user would sign, wait minutes, and still see "insufficient".
    expect(
      computeCoverableShortfall({
        ...base,
        fundingBalance: 0.1,
        tradingFreeBalance: 0.5,
      })
    ).toBe(0);
  });

  it("offers the move when trading covers the shortfall EXACTLY", () => {
    expect(
      computeCoverableShortfall({
        ...base,
        fundingBalance: 0.4,
        tradingFreeBalance: 0.6,
      })
    ).toBeCloseTo(0.6, 12);
  });

  it("tolerates float dust at the exact-cover boundary", () => {
    // 0.1 + 0.2 !== 0.3 in floats. Funding and trading are read on different
    // paths (pallet_assets vs engine), so this case occurs in practice; the
    // epsilon keeps it from flickering between offer and insufficient.
    expect(
      computeCoverableShortfall({
        isEvmSource: false,
        amountNeeded: 0.3,
        fundingBalance: 0.1,
        tradingFreeBalance: 0.2,
      })
    ).toBeGreaterThan(0);
  });

  it("never offers the move on the EVM side (no trading account exists)", () => {
    expect(computeCoverableShortfall({ ...base, isEvmSource: true })).toBe(0);
  });

  it("returns 0 for empty, zero, negative and non-finite amounts", () => {
    expect(computeCoverableShortfall({ ...base, amountNeeded: 0 })).toBe(0);
    expect(computeCoverableShortfall({ ...base, amountNeeded: -1 })).toBe(0);
    expect(computeCoverableShortfall({ ...base, amountNeeded: NaN })).toBe(0);
    expect(computeCoverableShortfall({ ...base, amountNeeded: Infinity })).toBe(
      0
    );
  });

  it("handles an empty funding account (bridge everything from trading)", () => {
    expect(
      computeCoverableShortfall({ ...base, fundingBalance: 0 })
    ).toBeCloseTo(1, 12);
  });

  it("epsilon is small enough to never move real value", () => {
    // The tolerance exists for float dust only. If it ever grows past a
    // satoshi-scale amount, it starts authorising moves trading cannot fund.
    expect(COVER_EPSILON).toBeLessThan(1e-8);
  });
});

describe("withdrawalAmount / ceil8", () => {
  it("rounds UP so the funding account cannot land one atom short", () => {
    // Withdrawing 0.899999999 for a 0.9 shortfall would re-block the
    // transfer after the user already waited out settlement.
    expect(ceil8(0.8999999901)).toBeCloseTo(0.9, 12);
    expect(withdrawalAmount(0.123456781)).toBeCloseTo(0.12345679, 12);
  });

  it("never rounds down", () => {
    for (const v of [0.1, 0.00000001, 1.00000001, 123.45678901]) {
      expect(ceil8(v)).toBeGreaterThanOrEqual(v - 1e-15);
    }
  });

  it("leaves exact 8dp values unchanged", () => {
    expect(ceil8(0.9)).toBeCloseTo(0.9, 12);
    expect(ceil8(0.12345678)).toBeCloseTo(0.12345678, 12);
  });

  it("adds at most one atom (1e-8) of padding", () => {
    for (const v of [0.123456781, 0.899999991, 5.000000001]) {
      expect(ceil8(v) - v).toBeLessThanOrEqual(1e-8);
    }
  });
});

describe("canResetOnClose", () => {
  it("allows reset only when nothing is in flight", () => {
    expect(canResetOnClose("consent")).toBe(true);
    expect(canResetOnClose("done")).toBe(true);
    expect(canResetOnClose("error")).toBe(true);
  });

  it("blocks reset while a withdrawal is signing or settling", () => {
    // Resetting mid-flight would show the consent screen again and let the
    // user sign a SECOND withdrawal for the same shortfall - the flow's one
    // double-spend hazard.
    expect(canResetOnClose("withdrawing")).toBe(false);
    expect(canResetOnClose("waiting")).toBe(false);
  });
});

describe("hasFundingArrived", () => {
  it("resolves only when funding covers the full need", () => {
    expect(hasFundingArrived(0.99, 1)).toBe(false);
    expect(hasFundingArrived(1, 1)).toBe(true);
    expect(hasFundingArrived(1.5, 1)).toBe(true);
  });

  it("works with the ceil8 padding end-to-end", () => {
    // Simulate the whole flow: funding 0.1, need 1, withdraw ceil8(0.9),
    // engine credits it, arrival check must pass.
    const funding = 0.1;
    const need = 1;
    const moved = withdrawalAmount(need - funding);
    expect(hasFundingArrived(funding + moved, need)).toBe(true);
  });
});

describe("totalFundingNeeded (mainnet fee model)", () => {
  it("adds the relayer fee only when the flag is on", () => {
    expect(
      totalFundingNeeded(1, { feesEnabled: true, relayerFee: 0.001 })
    ).toBeCloseTo(1.001, 12);
    expect(
      totalFundingNeeded(1, { feesEnabled: false, relayerFee: 0.001 })
    ).toBe(1);
  });

  it("testnet default (flag off) is byte-identical to the old behaviour", () => {
    for (const v of [0.5, 1, 100]) {
      expect(totalFundingNeeded(v, { feesEnabled: false, relayerFee: 5 })).toBe(
        v
      );
    }
  });

  it("ignores a negative fee and empty amounts", () => {
    expect(totalFundingNeeded(1, { feesEnabled: true, relayerFee: -1 })).toBe(
      1
    );
    expect(totalFundingNeeded(0, { feesEnabled: true, relayerFee: 1 })).toBe(0);
    expect(totalFundingNeeded(NaN, { feesEnabled: true, relayerFee: 1 })).toBe(
      0
    );
  });

  it("composes with the shortfall: the move covers amount + fee", () => {
    const needed = totalFundingNeeded(1, {
      feesEnabled: true,
      relayerFee: 0.01,
    });
    expect(
      computeCoverableShortfall({
        isEvmSource: false,
        amountNeeded: needed,
        fundingBalance: 0.1,
        tradingFreeBalance: 5,
      })
    ).toBeCloseTo(0.91, 12);
  });
});

describe("hasGasForBridge", () => {
  it("blocks below the PDEX floor only when the check is enabled", () => {
    expect(hasGasForBridge(0, 0.5, true)).toBe(false);
    expect(hasGasForBridge(0.49, 0.5, true)).toBe(false);
    expect(hasGasForBridge(0.5, 0.5, true)).toBe(true);
    // Flag off (testnet): never blocks, faucet auto-drips PDEX anyway.
    expect(hasGasForBridge(0, 0.5, false)).toBe(true);
  });
});
