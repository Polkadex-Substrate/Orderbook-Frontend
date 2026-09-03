import { describeFill, fillAmounts, fillTitle, formatQty } from "./fillReport";

/*
 * Ground truth, from the 1 September report with a balance reconciliation
 * attached:
 *
 *   Rested Sell 3 PDEX @ 0.52. Bought 2.5 @ 0.52 against it. The 0.5 remainder
 *   was worth 0.26 USDT, under the ~1 USDT minimum, so the engine cancelled it
 *   and credited it back.
 *
 *   Toast said:  "Filled exchange limit sell order for 3 PDEX"
 *   Truth was:   2.5 PDEX on both sides, per Trade History.
 *
 * The wire sends both quantities as strings, so every test uses strings.
 */

const REPORTED = { quantity: "3", filledQuantity: "2.5" };

describe("fillAmounts", () => {
  it("reports the reported case: 2.5 of 3, remainder 0.5", () => {
    expect(fillAmounts(REPORTED)).toEqual({
      filled: 2.5,
      ordered: 3,
      remainder: 0.5,
      complete: false,
    });
  });

  it("calls a full fill complete", () => {
    const a = fillAmounts({ quantity: "2.5", filledQuantity: "2.5" });
    expect(a.complete).toBe(true);
    expect(a.remainder).toBe(0);
  });

  it("never invents a negative remainder", () => {
    // A market order's placed quantity can be denominated differently from its
    // fill. Overstating a cancellation is the same class of lie as overstating
    // a fill, so this resolves to "complete" rather than a nonsense number.
    const a = fillAmounts({ quantity: "1", filledQuantity: "5" });
    expect(a.remainder).toBe(0);
    expect(a.complete).toBe(true);
  });

  it("survives missing, null and unparseable values", () => {
    for (const o of [
      null,
      undefined,
      {},
      { quantity: null, filledQuantity: null },
      { quantity: "abc", filledQuantity: "xyz" },
    ]) {
      expect(() => fillAmounts(o)).not.toThrow();
      expect(fillAmounts(o).filled).toBe(0);
    }
  });
});

describe("describeFill - the sentence that was wrong", () => {
  it("NEVER reports the ordered size as the filled size", () => {
    // THE bug, in one assertion. The old text was
    // "Filled exchange limit sell order for 3 PDEX".
    const text = describeFill({
      order: REPORTED,
      baseTicker: "PDEX",
      quoteTicker: "USDT",
      closed: true,
    });
    expect(text).toContain("2.5");
    expect(text).not.toMatch(/Filled 3 PDEX/);
  });

  it("names the cancelled remainder, which nothing did before", () => {
    // "the cancellation happens completely silently, bundled invisibly inside a
    // notification that claims full execution."
    const text = describeFill({
      order: REPORTED,
      baseTicker: "PDEX",
      quoteTicker: "USDT",
      closed: true,
    });
    expect(text).toContain("0.5");
    expect(text).toMatch(/cancelled/i);
    expect(text).toMatch(/minimum order size/i);
  });

  it("does NOT claim a cancellation while the order is still open", () => {
    // A resting partial may yet fill. Claiming it was cancelled is the same
    // mistake in the opposite direction.
    const text = describeFill({
      order: REPORTED,
      baseTicker: "PDEX",
      quoteTicker: "USDT",
      closed: false,
    });
    expect(text).toMatch(/still open/i);
    expect(text).not.toMatch(/cancelled/i);
  });

  it("stays simple for an ordinary complete fill", () => {
    const text = describeFill({
      order: { quantity: "2.5", filledQuantity: "2.5" },
      baseTicker: "PDEX",
      quoteTicker: "USDT",
      closed: true,
    });
    expect(text).toBe("Filled 2.5 PDEX by using USDT.");
    expect(text).not.toMatch(/of|remaining/);
  });
});

describe("fillTitle", () => {
  it("does not say 'Filled' for an order that only partly filled", () => {
    // The title is the part most people read.
    expect(
      fillTitle({
        order: REPORTED,
        typeLabel: "Limit",
        sideLabel: "Sell",
        closed: true,
      })
    ).not.toMatch(/Order Filled/);
  });

  it("says Filled for a complete fill", () => {
    expect(
      fillTitle({
        order: { quantity: "3", filledQuantity: "3" },
        typeLabel: "Limit",
        sideLabel: "Sell",
        closed: true,
      })
    ).toMatch(/Order Filled/);
  });
});

describe("formatQty", () => {
  it("never prints exponent notation for a dust remainder", () => {
    // Remainders are exactly where this gets used, and String(1e-8) is "1e-8".
    expect(formatQty(0.00000005)).not.toContain("e-");
  });

  it("does not pad a clean number with zeros", () => {
    expect(formatQty(2.5)).toBe("2.5");
    expect(formatQty(3)).toBe("3");
  });

  it("survives NaN and Infinity", () => {
    expect(formatQty(NaN)).toBe("0");
    expect(formatQty(Infinity)).toBe("0");
  });
});
