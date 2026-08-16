import { expandExponent, wouldHaveHung } from "./expandExponent";

/**
 * The number formatter, lifted out of `decimals.tsx` so it can be tested.
 *
 * WHY IT MOVED
 * `decimals.tsx` contains a React component, and ts-jest in this workspace does
 * not compile JSX, so nothing in that file could ever be unit tested. It also
 * contained two loops that could freeze the browser tab, which is precisely the
 * kind of thing you want under test. Same pattern as the rest of this package:
 * the logic lives in an import-free `.ts` module and the component delegates.
 *
 * THE TWO HANGS THIS FILE IS RESPONSIBLE FOR NOT REPRODUCING
 *
 * 1. Scientific notation. The old zero-counting loop ran forever on any
 *    exponential STRING whose mantissa was longer than the exponent accounted
 *    for - `"9.99e0"`, `"1.23e1"`, `"1.2345e2"`. Now delegated to
 *    `expandExponent`, which has no counter. See that file for the full account.
 *
 * 2. Padding to `precision`. `while (fraction.length <= precision)` terminates
 *    only because precision is small, and precision was never validated. A
 *    corrupt asset decimal arriving as 1e9 builds a billion-character string.
 *    Capped at MAX_PRECISION.
 *
 * Behaviour is otherwise identical, deliberately: it truncates rather than
 * rounds, pads to exactly `precision` digits, and applies separators the same
 * way. Every value already on screen must keep rendering exactly as it does.
 */

/**
 * Widest fraction this formatter will pad to.
 *
 * Polkadex assets carry 12 decimals, ERC-20s at most 18, and nothing in this UI
 * shows more than 8. Beyond this the input is corrupt, and honouring it means
 * building a string long enough to freeze the tab.
 */
export const MAX_PRECISION = 30;

export type FormatValue = string | number | undefined;

/** Clamp a precision to something a string can actually be padded to. */
export const safePrecision = (precision: number): number =>
  Number.isFinite(precision) && precision > 0
    ? Math.min(Math.floor(precision), MAX_PRECISION)
    : 0;

export const formatWithSeparators = (
  value: string,
  thousSep?: string,
  floatSep?: string
): string => {
  let fmtNum = value;

  if (thousSep !== floatSep) {
    if (floatSep) {
      fmtNum = fmtNum.replace(".", floatSep);
    }

    if ((thousSep && floatSep) || (thousSep && !floatSep && thousSep !== ".")) {
      const fmtNumParts = fmtNum.toString().split(floatSep || ".");
      fmtNumParts[0] = fmtNumParts[0].replace(
        /\B(?=(\d{3})+(?!\d))/g,
        thousSep
      );
      fmtNum = fmtNumParts.join(floatSep || ".");
    }
  }

  return fmtNum;
};

export const formatDecimal = (
  value: FormatValue,
  precision: number,
  thousSep?: string,
  floatSep?: string,
  /**
   * Called for an input that WOULD have hung the old implementation, so we can
   * find out whether such values actually arrive in production rather than
   * merely being able to. Injected rather than imported, so this module stays
   * free of Sentry and the reporting itself is testable.
   */
  onDangerousInput?: (value: string) => void
): string => {
  if (typeof value === "undefined") return "0";

  /*
   * Checked on the CALLER'S value only, and only for the shape that used to
   * hang.
   *
   * Two traps here, both found by test. Reporting any exponential notation
   * fires on every dust amount, because `String(1e-8)` is `"1e-8"`. And
   * checking inside the expansion helper fires on the formatter's own
   * intermediate: the round-trip below turns 0.00000001 into `1e-8` regardless
   * of how the caller wrote it. Either would send a Sentry message per rendered
   * number, which is its own outage.
   */
  if (onDangerousInput) {
    const original = String(value);
    if (wouldHaveHung(original)) onDangerousInput(original);
  }

  const expand = (input: string | number): string =>
    expandExponent(String(input ?? ""));

  let fmtVal: string | number = "";
  let isPositive = true;
  let result = "0";

  if (typeof value === "string" && Number(value) < 0) {
    fmtVal = value.slice(1);
    isPositive = false;
  } else if (typeof value === "number" && value < 0) {
    fmtVal = value * -1;
    isPositive = false;
  } else {
    fmtVal = value;
  }

  if (fmtVal !== "" && fmtVal !== 0) {
    result = expand(
      Number(
        `${Math.floor(Number(`${expand(fmtVal)}e${precision}`))}e-${precision}`
      )
    );
  }

  const pad = safePrecision(precision);

  if (result.indexOf(".") === -1 && pad > 0) {
    result += ".";
  }

  while (result.slice(result.indexOf(".")).length <= pad) {
    result += "0";
  }

  result = formatWithSeparators(result, thousSep, floatSep);

  return isPositive ? result : `-${result}`;
};
