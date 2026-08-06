/**
 * Display formatting for amounts and prices.
 *
 * THE PROBLEM THIS SOLVES
 *
 * The UI showed fixed precision everywhere - ~33 hardcoded `toFixed(n)` calls
 * plus `Decimal.format(v, n)`, which pads with trailing zeros to exactly n
 * digits. Applied uniformly regardless of the asset or the magnitude, that
 * produces walls of meaningless zeros ("2,370.80000000") and makes the interface
 * hard to scan. One case was actively wrong: `toFixed(4)` rendered a genuinely
 * small amount as "0.0000", which reads as zero.
 *
 * WHY NOT JUST FEWER DECIMALS
 *
 * Because this is a trading UI. Blunt rounding is worse than the noise: a user
 * must be able to tell 0.00001234 from 0.00001235, and "0.0000" for both is a
 * correctness bug wearing a tidiness costume. So the rule is SIGNIFICANT digits,
 * not fixed decimals - small numbers keep their meaningful digits, large numbers
 * stop pretending to eight decimals of accuracy.
 *
 * Full precision is never destroyed: `toFullPrecision` is what a tooltip or a
 * detail view should show, so the exact figure is always one hover away.
 */

/** Digits that carry information, for values below 1. */
const DEFAULT_SIGNIFICANT = 4;
/** Decimals for values at or above 1. Two is conventional for a quote price. */
const DEFAULT_MAX_DECIMALS = 4;

export type FormatOptions = {
  /** Significant digits kept for |value| < 1. Default 4. */
  significant?: number;
  /** Hard cap on decimals for |value| >= 1. Default 4. */
  maxDecimals?: number;
  /** Thousands separator. Pass "," to group; omit for none. */
  thousandsSep?: string;
  /**
   * Never exceed this many decimals - normally the asset's on-chain precision.
   * Showing more decimals than the asset supports invents precision.
   */
  assetPrecision?: number;
};

/** Strip trailing zeros, and a trailing dot if everything after it went. */
const trimTrailingZeros = (s: string): string =>
  s.includes(".") ? s.replace(/\.?0+$/, "") : s;

const group = (s: string, sep?: string): string => {
  if (!sep) return s;
  const [int, frac] = s.split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  return frac ? `${grouped}.${frac}` : grouped;
};

/**
 * How many decimals are needed to show `significant` meaningful digits.
 *
 * 0.00001234 has its first meaningful digit at the 5th decimal, so 4 significant
 * digits needs 8 decimals. Derived from the exponent rather than by counting
 * characters, which avoids a string scan and handles scientific notation.
 */
const decimalsForSignificant = (abs: number, significant: number): number => {
  const firstDigitPlace = Math.floor(Math.log10(abs)); // -5 for 0.00001234
  return Math.max(0, significant - 1 - firstDigitPlace);
};

/**
 * Format a number for display.
 *
 * Values >= 1 get at most `maxDecimals`; values < 1 keep `significant` digits.
 * Trailing zeros are always trimmed, so 2370.8 is "2,370.8" rather than
 * "2,370.8000".
 */
export const formatDisplay = (
  value: number | string | null | undefined,
  options: FormatOptions = {}
): string => {
  const {
    significant = DEFAULT_SIGNIFICANT,
    maxDecimals = DEFAULT_MAX_DECIMALS,
    thousandsSep,
    assetPrecision,
  } = options;

  const n = typeof value === "string" ? Number(value) : value;

  // Distinguish "no value" from zero: an empty cell is not the same claim as 0.
  if (n === null || n === undefined || !Number.isFinite(n)) return "-";
  if (n === 0) return "0";

  const abs = Math.abs(n);
  let decimals =
    abs >= 1 ? maxDecimals : decimalsForSignificant(abs, significant);

  if (assetPrecision !== undefined) {
    decimals = Math.min(decimals, assetPrecision);
  }

  // toFixed caps at 100 and throws beyond it.
  const fixed = n.toFixed(Math.min(decimals, 100));

  // A nonzero value must never render as "0" or "0.0000" - that states the wrong
  // fact. Fall back to the smallest representation that still shows it exists.
  if (Number(fixed) === 0) {
    return `<${group(trimTrailingZeros((10 ** -decimals).toFixed(decimals)), thousandsSep)}`;
  }

  return group(trimTrailingZeros(fixed), thousandsSep);
};

/**
 * Expand scientific notation without going through toFixed.
 *
 * "1e-7" is not a number a trader wants to read, but toFixed is the wrong tool
 * for widening it - see toFullPrecision below.
 */
const expandExponent = (s: string): string => {
  if (!/[eE]/.test(s)) return s;

  const [mantissa, expPart] = s.split(/[eE]/);
  const exp = Number(expPart);
  const negative = mantissa.startsWith("-");
  const digits = mantissa.replace(/^-/, "").replace(".", "");
  const dotAt = mantissa.replace(/^-/, "").indexOf(".");
  const intLen =
    (dotAt === -1 ? mantissa.replace(/^-/, "").length : dotAt) + exp;
  const sign = negative ? "-" : "";

  if (intLen <= 0) return `${sign}0.${"0".repeat(-intLen)}${digits}`;
  if (intLen >= digits.length)
    return `${sign}${digits}${"0".repeat(intLen - digits.length)}`;
  return `${sign}${digits.slice(0, intLen)}.${digits.slice(intLen)}`;
};

/**
 * The exact value, for tooltips and detail views.
 *
 * Uses the number's own string form, NOT toFixed(20). toFixed(20) surfaces the
 * binary representation error that a double was hiding: `(2370.8).toFixed(20)`
 * is "2370.80000000000018189894", which as a tooltip claims a precision that
 * does not exist and looks broken. `String(2370.8)` is "2370.8" because JS emits
 * the shortest string that round-trips to the same double - which is exactly the
 * value the user meant.
 *
 * Scientific notation is expanded, since String() switches to it below 1e-7.
 */
export const toFullPrecision = (
  value: number | string | null | undefined
): string => {
  const n = typeof value === "string" ? Number(value) : value;
  if (n === null || n === undefined || !Number.isFinite(n)) return "-";
  if (n === 0) return "0";

  return trimTrailingZeros(expandExponent(String(n)));
};

/**
 * True when the displayed value hides detail, i.e. a tooltip is worth showing.
 * Lets callers avoid attaching a tooltip that would repeat the visible text.
 */
export const isTruncated = (
  value: number | string | null | undefined,
  options: FormatOptions = {}
): boolean => {
  const shown = formatDisplay(value, options);
  return shown.startsWith("<") || shown !== toFullPrecision(value);
};
