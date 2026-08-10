import { amountValue, isAmountLike } from "./amountFormat";

/*
 * Tests for the amount predicate. Runner is JEST (packages/core "test": "jest"),
 * so describe/it/expect come from globals and there is no import - matching every
 * other test in this package.
 *
 * Loops assert on { input, ok } rather than a bare boolean, because jest's
 * expect() takes no message argument: without the input in the payload, a
 * failure inside a loop says "expected false to be true" and not which value
 * caused it.
 */

/** Keeps the failing input visible in the diff. */
const check = (value: unknown) => ({
  input: String(value),
  ok: isAmountLike(value),
});
const accepts = (value: unknown) => ({ input: String(value), ok: true });
const rejects = (value: unknown) => ({ input: String(value), ok: false });

describe("isAmountLike - the reported bug", () => {
  it("accepts a leading-dot fraction, which is what Suresh typed", () => {
    // 0.14820303 ETH available, bridging .12, told "Must be a number".
    expect(check(".12")).toEqual(accepts(".12"));
  });

  it("accepts every leading-dot form", () => {
    for (const v of [".1", ".12", ".000001", ".5"]) {
      expect(check(v)).toEqual(accepts(v));
    }
  });

  it("gives a leading-dot amount the right value", () => {
    expect(amountValue(".12")).toBe(0.12);
  });

  it("accepts a trailing dot, which is a half-typed decimal", () => {
    // Typing "12.5" passes through "12." on the way. Rejecting it flashes an
    // error mid-keystroke, which reads as though the field is broken.
    expect(check("12.")).toEqual(accepts("12."));
    expect(amountValue("12.")).toBe(12);
  });
});

describe("isAmountLike - what it still accepts", () => {
  it("accepts the ordinary forms", () => {
    for (const v of ["0", "1", "12", "0.12", "12.5", "100.000001"]) {
      expect(check(v)).toEqual(accepts(v));
    }
  });

  it("accepts zero, leaving 'is it positive' to a separate test", () => {
    // The schemas have their own ZERO check with its own message. Conflating
    // the two would tell someone entering 0 that 0 is not a number.
    for (const v of ["0", "0.0", ".0"]) {
      expect(check(v)).toEqual(accepts(v));
    }
  });

  it("accepts long precision, since token decimals go to 18", () => {
    expect(check("0.000000000000000001")).toEqual(
      accepts("0.000000000000000001")
    );
  });
});

describe("isAmountLike - what it rejects", () => {
  it("rejects things that are not parseable at all", () => {
    for (const v of ["", ".", "..", "1.2.3", "abc", "1abc", "-", "e5"]) {
      expect(check(v)).toEqual(rejects(v));
    }
  });

  it("rejects signed amounts", () => {
    // There is no such thing as bridging minus twelve.
    for (const v of ["-1", "-0.5", "+1", "-.5"]) {
      expect(check(v)).toEqual(rejects(v));
    }
  });

  it("rejects scientific notation even though Number() accepts it", () => {
    expect(Number("1e5")).toBe(100000);
    for (const v of ["1e5", "1E5", "1e-5"]) {
      expect(check(v)).toEqual(rejects(v));
    }
  });

  it("rejects whitespace and thousands separators", () => {
    for (const v of [" 12", "12 ", "1 2", "1,000", "1_000", "1'000"]) {
      expect(check(v)).toEqual(rejects(v));
    }
  });

  it("rejects non-ASCII digits", () => {
    // Written first as "Number('１２') === 12, so a Number()-only check would
    // accept these" - which is FALSE. Number() gives NaN for full-width and
    // Arabic-Indic digits; it only strips whitespace. The test caught the wrong
    // premise. Both layers agree here, and pinning it means a future "just use
    // Number()" simplification does not have to rediscover it.
    for (const v of ["１２", "١٢", "๑๒"]) {
      expect(Number(v)).toBeNaN();
      expect(check(v)).toEqual(rejects(v));
    }
  });

  it("rejects the non-finite literals", () => {
    for (const v of ["Infinity", "-Infinity", "NaN"]) {
      expect(check(v)).toEqual(rejects(v));
    }
  });

  it("rejects non-strings, including numbers", () => {
    // The form fields hold strings. A number arriving here means a caller
    // changed and should be looked at, not quietly coerced.
    for (const v of [undefined, null, 12, {}, [], true]) {
      expect(check(v)).toEqual(rejects(v));
    }
  });

  it("rejects the empty string rather than treating it as zero", () => {
    // "Required" is a different message from "Must be a number", and an empty
    // field should get the first one.
    expect(check("")).toEqual(rejects(""));
  });
});

describe("amountValue", () => {
  it("returns NaN for unparseable input instead of 0", () => {
    // Number(value || 0) used to make "abc" into 0, which then failed the
    // minimum check and reported "Minimum amount: X" for input that was never
    // a number. NaN keeps the two failures distinct.
    expect(amountValue("abc")).toBeNaN();
    expect(amountValue("")).toBeNaN();
    expect(amountValue(undefined)).toBeNaN();
  });

  it("makes every comparison against NaN false, so nothing passes by accident", () => {
    const v = amountValue("abc");
    expect(v >= 0).toBe(false);
    expect(v <= Number.MAX_SAFE_INTEGER).toBe(false);
    expect(v > 0).toBe(false);
  });

  it("round-trips the accepted forms", () => {
    expect(amountValue("12")).toBe(12);
    expect(amountValue("12.5")).toBe(12.5);
    expect(amountValue(".12")).toBe(0.12);
    expect(amountValue("0")).toBe(0);
  });
});
