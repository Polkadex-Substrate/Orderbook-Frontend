import { MAX_PRECISION, formatDecimal, safePrecision } from "./formatDecimal";

/*
 * Jest globals, matching the rest of this package.
 *
 * Every price, quantity and balance on the trading screen goes through this
 * function, and none of it was tested until now, because it lived in a `.tsx`
 * file that ts-jest here cannot compile. Two of the loops inside it could hang
 * the browser tab.
 *
 * The hang tests fail BY TIMEOUT rather than by assertion, which is the right
 * failure mode: a wrong answer is a bug, a function that never returns is an
 * outage.
 */

describe("the inputs that froze the trading page", () => {
  it("formats an exponential string instead of looping forever", () => {
    // Mantissa longer than the exponent accounts for, so the old zero-counting
    // loop started negative and counted away from zero.
    expect(formatDecimal("9.99e0", 2)).toBe("9.99");
    expect(formatDecimal("1.23e1", 2)).toBe("12.30");
    expect(formatDecimal("1.2345e2", 2)).toBe("123.45");
  });

  it("handles the capital-E form a decimal serialiser emits", () => {
    expect(formatDecimal("1.23E2", 2)).toBe("123.00");
  });

  it("does not hang on an absurd precision", () => {
    // Verified against the original: 1e9 built a billion-character string.
    const out = formatDecimal("1.5", 1e9);
    expect(typeof out).toBe("string");
    expect(out.length).toBeLessThan(MAX_PRECISION + 10);
  });

  it("survives a non-finite or negative precision", () => {
    for (const precision of [NaN, Infinity, -1, -1e9]) {
      expect(typeof formatDecimal("1.5", precision)).toBe("string");
    }
  });
});

describe("ordinary values must render exactly as they do today", () => {
  it("pads to the requested precision", () => {
    expect(formatDecimal("1.5", 2)).toBe("1.50");
    expect(formatDecimal("1", 4)).toBe("1.0000");
    expect(formatDecimal(2, 3)).toBe("2.000");
  });

  it("truncates rather than rounds, as before", () => {
    expect(formatDecimal("1.999", 2)).toBe("1.99");
  });

  it("keeps negatives negative", () => {
    expect(formatDecimal("-1.5", 2)).toBe("-1.50");
    expect(formatDecimal(-1.5, 2)).toBe("-1.50");
  });

  it("renders dust without falling back to scientific notation", () => {
    // String(1e-8) is "1e-8". Showing that in a balance column is what the
    // expansion exists to prevent.
    expect(formatDecimal(0.00000001, 8)).toBe("0.00000001");
  });

  it("applies thousands separators", () => {
    expect(formatDecimal("1234.5", 2, ",")).toBe("1,234.50");
  });

  it("returns 0 for undefined", () => {
    expect(formatDecimal(undefined, 2)).toBe("0");
  });
});

describe("safePrecision", () => {
  it("clamps anything unusable to zero", () => {
    for (const p of [NaN, Infinity, -Infinity, -1, 0]) {
      expect({ p: String(p), out: safePrecision(p) }).toEqual({
        p: String(p),
        out: 0,
      });
    }
  });

  it("caps a large precision rather than honouring it", () => {
    expect(safePrecision(1e9)).toBe(MAX_PRECISION);
  });

  it("leaves every real asset precision alone", () => {
    // 8 on screen, 12 for Polkadex assets, 18 for ERC-20s.
    for (const p of [2, 8, 12, 18]) {
      expect({ p, out: safePrecision(p) }).toEqual({ p, out: p });
    }
  });
});

describe("the dangerous-input report", () => {
  it("fires with the offending value, so we learn whether this was the freeze", () => {
    const seen: string[] = [];
    formatDecimal("9.99e0", 2, undefined, undefined, (v) => seen.push(v));
    expect(seen).toEqual(["9.99e0"]);
  });

  it("stays silent for ordinary decimals", () => {
    // This runs on every rendered number. A false positive would be its own
    // incident.
    const seen: string[] = [];
    for (const v of ["1.5", "0.00000001", "-42", "1234.5"]) {
      formatDecimal(v, 8, undefined, undefined, (x) => seen.push(x));
    }
    expect(seen).toEqual([]);
  });

  it("stays silent for harmless exponential values", () => {
    // THIS CASE WAS CAUGHT BY THE TEST, NOT BY REVIEW. `String(1e-8)` is
    // "1e-8", so a report on "any exponential notation" fires on every dust
    // balance on the page. Worse, the formatter's own round-trip produces
    // "1e-8" internally even when the caller passed "0.00000001", so checking
    // inside the expansion helper reports on values the caller never sent.
    // Only the shape that actually used to hang is worth a message.
    const seen: string[] = [];
    for (const v of [1e-8, "1e-8", "1.5e2", "1.2e5", "1e21"]) {
      formatDecimal(v, 8, undefined, undefined, (x) => seen.push(x));
    }
    expect(seen).toEqual([]);
  });

  it("is optional - the formatter works with no reporter at all", () => {
    expect(formatDecimal("9.99e0", 2)).toBe("9.99");
  });
});
