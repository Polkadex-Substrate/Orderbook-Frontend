import {
  MAX_EXPANSION,
  expandExponent,
  isExponentialNotation,
} from "./expandExponent";

/*
 * Jest globals, matching the rest of this package.
 *
 * The three inputs at the top of the first block are the ones that made the
 * original implementation hang forever. They are the reason this file exists,
 * so they are asserted first and by value: it is not enough that the function
 * returns, it has to return the RIGHT number, or a frozen tab is traded for a
 * wrong price on a trading screen.
 */

describe("the inputs that used to hang forever", () => {
  it("expands them correctly instead of looping", () => {
    // `while (power--)` reached these with power = -2, -1 and -2 and counted
    // away from zero, appending a character per iteration, until the tab died.
    expect(expandExponent("9.99e0")).toBe("9.99");
    expect(expandExponent("1.23e1")).toBe("12.3");
    expect(expandExponent("1.2345e2")).toBe("123.45");
  });

  it("expands the neighbouring cases that happened to work before", () => {
    // These terminated under the old code. They must keep their exact values,
    // because they are the ones already rendering correctly today.
    expect(expandExponent("1.5e2")).toBe("150");
    expect(expandExponent("1.2e5")).toBe("120000");
    expect(expandExponent("1.234e3")).toBe("1234");
  });
});

describe("expandExponent - small numbers, which is what a DEX actually shows", () => {
  it("expands the notation JavaScript itself produces below 1e-7", () => {
    // String(0.00000001) is "1e-8". Dust balances and tick sizes land here
    // constantly, so this is the common path, not an edge case.
    expect(expandExponent("1e-8")).toBe("0.00000001");
    expect(expandExponent(1e-8)).toBe("0.00000001");
    expect(expandExponent("1.5e-8")).toBe("0.000000015");
    expect(expandExponent("1.23456e-7")).toBe("0.000000123456");
  });

  it("expands large magnitudes the same way", () => {
    expect(expandExponent("1e21")).toBe("1000000000000000000000");
    expect(expandExponent("1.2345e21")).toBe("1234500000000000000000");
  });

  it("keeps the sign", () => {
    expect(expandExponent("-9.99e0")).toBe("-9.99");
    expect(expandExponent("-1e-8")).toBe("-0.00000001");
    expect(expandExponent("+1.23e1")).toBe("12.3");
  });

  it("accepts a capital E, as backends tend to emit", () => {
    // A decimal serialiser writing "1.23E2" is the likeliest real source of the
    // hang: no JavaScript number ever stringifies to that shape.
    expect(expandExponent("1.23E2")).toBe("123");
    expect(expandExponent("1E-8")).toBe("0.00000001");
  });
});

describe("expandExponent - totality, the property that matters", () => {
  it("returns something for every kind of junk, and never hangs", () => {
    // Written as a loop over one assertion so a hang would fail the suite by
    // timeout rather than by silently passing a narrower case.
    const junk = [
      "",
      "abc",
      "e5",
      ".e5",
      "1.2.3e5",
      "1e",
      "1e5e5",
      "NaN",
      "Infinity",
      "-Infinity",
      "1eNaN",
      "1e+",
      "0",
      "0e0",
      "-0e0",
      "1e0",
    ];
    for (const value of junk) {
      expect(typeof expandExponent(value)).toBe("string");
    }
  });

  it("passes through values that carry no exponent at all", () => {
    for (const value of ["1.5", "0.00000001", "-42", "0"]) {
      expect({ value, out: expandExponent(value) }).toEqual({
        value,
        out: value,
      });
    }
  });

  it("refuses to build an absurdly long string", () => {
    // "0".repeat(1e9) is its own denial of service, so an exponent past the cap
    // returns the input unexpanded. It renders oddly; it does not freeze.
    const huge = "1e-100000";
    expect(expandExponent(huge)).toBe(huge);
    expect(expandExponent("1e1000000")).toBe("1e1000000");
  });

  it("still expands right up to the cap", () => {
    const justInside = `1e-${MAX_EXPANSION - 10}`;
    expect(expandExponent(justInside).length).toBeLessThanOrEqual(
      MAX_EXPANSION + 2
    );
    expect(expandExponent(justInside).startsWith("0.")).toBe(true);
  });

  it("agrees with Number for every value Number can represent exactly", () => {
    // An independent check on correctness: for ordinary magnitudes the expanded
    // string must parse back to the same number. Comparing against a second
    // implementation is worth more than more hand-written expectations.
    const values = [
      "9.99e0",
      "1.23e1",
      "1.2345e2",
      "1.5e2",
      "1e-8",
      "1.5e-8",
      "-3.25e3",
      "7e0",
      "1.23E2",
    ];
    for (const value of values) {
      expect({ value, n: Number(expandExponent(value)) }).toEqual({
        value,
        n: Number(value),
      });
    }
  });
});

describe("isExponentialNotation - so we learn whether this was ever hit", () => {
  it("recognises the shapes that reach the expansion path", () => {
    for (const value of ["1e-8", "9.99e0", "1.23E2", "-1.5e+3", "1E5"]) {
      expect({ value, exp: isExponentialNotation(value) }).toEqual({
        value,
        exp: true,
      });
    }
  });

  it("does not fire on ordinary decimals", () => {
    // This runs on every price render. A false positive would send a Sentry
    // message per formatted number, which is its own outage.
    for (const value of ["1.5", "0", "-42", "0.00000001", "", "abc"]) {
      expect({ value, exp: isExponentialNotation(value) }).toEqual({
        value,
        exp: false,
      });
    }
  });
});
