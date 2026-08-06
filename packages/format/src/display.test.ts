import { formatDisplay, toFullPrecision, isTruncated } from "./display";

/*
 * These exist because the formatter's whole job is to decide what to hide, and
 * every interesting case is a boundary: the value that rounds to zero, the value
 * whose exact decimal form a double cannot hold, the value smaller than the
 * asset's own precision. Those are exactly the cases a manual click-through does
 * not produce.
 *
 * packages/format already had jest, ts-jest and a `test` script, and no test
 * files at all - so this is the first thing that script has ever run.
 */

describe("formatDisplay", () => {
  describe("values >= 1 get fixed decimals", () => {
    it("trims trailing zeros instead of padding", () => {
      // The bug this replaced: toFixed(8) rendered this as "2370.80000000".
      expect(formatDisplay(2370.8)).toBe("2370.8");
    });

    it("caps at maxDecimals", () => {
      expect(formatDisplay(1.23456789)).toBe("1.2346");
      expect(formatDisplay(1.23456789, { maxDecimals: 2 })).toBe("1.23");
    });

    it("drops the decimal point when nothing survives the trim", () => {
      expect(formatDisplay(42)).toBe("42");
      expect(formatDisplay(42.0)).toBe("42");
    });
  });

  describe("values < 1 keep significant digits, not decimal places", () => {
    it("keeps small values legible instead of rounding them to 0.0000", () => {
      // The correctness bug: toFixed(4) made this "0.0000", which reads as zero.
      expect(formatDisplay(0.00001234)).toBe("0.00001234");
    });

    it("distinguishes two nearby small values", () => {
      // The reason significant digits matter at all on a trading screen.
      expect(formatDisplay(0.00001234)).not.toBe(formatDisplay(0.00001235));
    });

    it("honours a custom significant-digit count", () => {
      expect(formatDisplay(0.00001234, { significant: 2 })).toBe("0.000012");
    });
  });

  describe("the zero-vs-nothing distinction", () => {
    it("renders real zero as 0", () => {
      expect(formatDisplay(0)).toBe("0");
    });

    it("renders absent values as a dash, not as zero", () => {
      // An empty cell is a different claim from a zero balance.
      expect(formatDisplay(null)).toBe("-");
      expect(formatDisplay(undefined)).toBe("-");
      expect(formatDisplay(NaN)).toBe("-");
      expect(formatDisplay(Infinity)).toBe("-");
      expect(formatDisplay("not a number")).toBe("-");
    });

    it("never renders a nonzero value as zero", () => {
      // assetPrecision caps decimals below what the value needs, so the naive
      // result would be "0.00" - stating the wrong fact. Falls back to a bound.
      expect(formatDisplay(0.0000001, { assetPrecision: 2 })).toBe("<0.01");
    });
  });

  describe("assetPrecision", () => {
    it("never shows more decimals than the asset supports", () => {
      expect(formatDisplay(1.23456789, { assetPrecision: 2 })).toBe("1.23");
    });

    it("does not pad up to the asset precision", () => {
      expect(formatDisplay(1.5, { assetPrecision: 8 })).toBe("1.5");
    });
  });

  describe("grouping", () => {
    it("groups only when asked", () => {
      expect(formatDisplay(1234567.5)).toBe("1234567.5");
      expect(formatDisplay(1234567.5, { thousandsSep: "," })).toBe(
        "1,234,567.5"
      );
    });

    it("groups the integer part only", () => {
      expect(formatDisplay(1234.5678, { thousandsSep: "," })).toBe(
        "1,234.5678"
      );
    });
  });

  describe("negatives", () => {
    it("keeps the sign and does not group it", () => {
      expect(formatDisplay(-2370.8)).toBe("-2370.8");
      expect(formatDisplay(-1234567.5, { thousandsSep: "," })).toBe(
        "-1,234,567.5"
      );
    });

    it("applies significant digits to the magnitude", () => {
      expect(formatDisplay(-0.00001234)).toBe("-0.00001234");
    });
  });

  it("accepts numeric strings, since GraphQL sends amounts as strings", () => {
    expect(formatDisplay("2370.8")).toBe("2370.8");
    expect(formatDisplay("0.00001234")).toBe("0.00001234");
  });
});

describe("toFullPrecision", () => {
  it("does not invent precision a double never had", () => {
    // The regression this guards: an earlier version used toFixed(20), which
    // surfaces the binary representation error and returned
    // "2370.80000000000018189894" - a tooltip that looks broken.
    expect(toFullPrecision(2370.8)).toBe("2370.8");
  });

  it("round-trips every value exactly", () => {
    const values = [
      2370.8, 0.1, 0.3, 1e-7, 1.5e-9, 123456.789, 0.00001234, -0.1,
    ];
    for (const v of values) {
      expect(Number(toFullPrecision(v))).toBe(v);
    }
  });

  it("expands scientific notation, which String() switches to below 1e-7", () => {
    expect(String(1e-7)).toBe("1e-7"); // documents why this is needed
    expect(toFullPrecision(1e-7)).toBe("0.0000001");
    expect(toFullPrecision(1.5e-9)).toBe("0.0000000015");
    expect(toFullPrecision(-1e-7)).toBe("-0.0000001");
  });

  it("expands large exponents too", () => {
    expect(toFullPrecision(1e21)).toBe("1000000000000000000000");
  });

  it("matches formatDisplay on the empty and zero cases", () => {
    expect(toFullPrecision(0)).toBe("0");
    expect(toFullPrecision(null)).toBe("-");
    expect(toFullPrecision(NaN)).toBe("-");
  });
});

describe("isTruncated", () => {
  it("is false when the display already shows everything", () => {
    // Callers use this to avoid attaching a tooltip that repeats the visible text.
    expect(isTruncated(2370.8)).toBe(false);
    expect(isTruncated(42)).toBe(false);
  });

  it("is true when decimals were dropped", () => {
    expect(isTruncated(1.23456789)).toBe(true);
  });

  it("is true when the value fell back to a bound", () => {
    expect(isTruncated(0.0000001, { assetPrecision: 2 })).toBe(true);
  });

  it("is false for absent values, which hide nothing", () => {
    expect(isTruncated(null)).toBe(false);
  });
});
