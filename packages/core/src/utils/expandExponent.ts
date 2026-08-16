/**
 * Expanding scientific notation into a plain decimal string.
 *
 * THE BUG THIS REPLACES: AN INFINITE LOOP IN THE PRICE FORMATTER
 * `decimals.tsx` carried this:
 *
 *     let power = Number(data[1]) + 1;
 *     if (power < 0) { ... while (power++) result += "0"; ... }
 *     power -= str.length;
 *     while (power--) result += "0";
 *
 * `while (power--)` terminates only by counting DOWN to zero. Reach it with a
 * negative `power` and it counts away from zero forever, appending to a string
 * on every iteration. `power` is negative whenever the mantissa has more digits
 * than the exponent shifts the point by:
 *
 *     "9.99e0"    ->  power = 1 - 3 = -2   ->  never returns
 *     "1.23e1"    ->  power = 2 - 3 = -1   ->  never returns
 *     "1.2345e2"  ->  power = 3 - 5 = -2   ->  never returns
 *
 * Verified by running the original in a child process with a timeout: those
 * three hang, `"1.5e2"` and `"1.2e5"` do not.
 *
 * `String(number)` never produces such a value - JavaScript only uses
 * exponential form for magnitudes above 1e21 or below 1e-7, where the exponent
 * is always large enough - so this was unreachable from a JS number. It is very
 * reachable from a STRING, and prices, balances and quantities arrive from the
 * API as strings. A backend that serialises decimals as `1.23E2` is all it
 * takes.
 *
 * THE SHAPE OF THE FAILURE MATTERS. It burns the main thread with no exception,
 * so nothing reaches Sentry; it never recovers, so waiting does not help; and it
 * cannot be interrupted, so the debugger cannot pause it. That is exactly what
 * the trading page has been doing.
 *
 * WHAT THIS DOES INSTEAD
 * Decomposes the value and places the decimal point by arithmetic rather than by
 * counting a loop towards a boundary it can miss. There is no counter, so there
 * is nothing to count past.
 *
 * Import-free and pure, so it is testable without a renderer, and so a hanging
 * input can be run under a timeout.
 */

/**
 * Widest expansion we will produce, in characters.
 *
 * `1e-500` would expand to five hundred zeros, and `"0".repeat` on a large
 * enough count is its own denial of service. Nothing in a financial UI needs
 * more than this; past it the original string is returned unchanged, which
 * renders oddly but renders, and is a far better outcome than a frozen tab.
 */
export const MAX_EXPANSION = 1_000;

/**
 * `1.5e-8` -> `"0.000000015"`. Values with no exponent are returned untouched.
 *
 * Total by construction: every input either expands or is returned as given.
 * There is no path that does not return.
 */
export const expandExponent = (value: string | number): string => {
  const input = String(value);
  const parts = input.split(/[eE]/);
  if (parts.length !== 2) return input;

  const exponent = Number(parts[1]);
  // NaN, Infinity, or a second `e`. Nothing sensible to expand.
  if (!Number.isFinite(exponent)) return input;

  let mantissa = parts[0];
  let sign = "";
  if (mantissa.startsWith("-") || mantissa.startsWith("+")) {
    sign = mantissa[0] === "-" ? "-" : "";
    mantissa = mantissa.slice(1);
  }

  const dot = mantissa.indexOf(".");
  const intPart = dot === -1 ? mantissa : mantissa.slice(0, dot);
  const fracPart = dot === -1 ? "" : mantissa.slice(dot + 1);
  const digits = `${intPart}${fracPart}`;

  // Not a number we can take apart: "abce5", "e5", ".e5".
  if (!/^\d+$/.test(digits)) return input;

  // Where the decimal point lands once the exponent is applied, counted from
  // the left of `digits`. Zero or less means the value is below 1 and needs
  // leading zeros; beyond the end means trailing zeros.
  const pointPosition = intPart.length + exponent;

  if (pointPosition <= 0) {
    const zeros = -pointPosition;
    if (zeros + digits.length > MAX_EXPANSION) return input;
    return `${sign}0.${"0".repeat(zeros)}${digits}`;
  }

  if (pointPosition >= digits.length) {
    const zeros = pointPosition - digits.length;
    if (zeros + digits.length > MAX_EXPANSION) return input;
    return `${sign}${digits}${"0".repeat(zeros)}`;
  }

  return `${sign}${digits.slice(0, pointPosition)}.${digits.slice(
    pointPosition
  )}`;
};

/**
 * Was this value written in scientific notation?
 *
 * Note that most exponential values were always harmless. `String(1e-8)` is
 * `"1e-8"`, and dust amounts produce it constantly, including as an
 * intermediate inside the formatter's own round-trip. Use `wouldHaveHung` for
 * telemetry; this is here for the cases that want the plain question.
 */
export const isExponentialNotation = (value: string | number): boolean =>
  /^[+-]?\d*\.?\d+[eE][+-]?\d+$/.test(String(value));

/**
 * Would the ORIGINAL implementation have hung on this value?
 *
 * The old code, exactly:
 *
 *     let power = Number(data[1]) + 1;
 *     if (power < 0) { while (power++) ... }   // counts UP to zero: terminates
 *     power -= str.length;
 *     while (power--) ...                      // counts DOWN: hangs if < 0
 *
 * So the fatal combination is an exponent that does not go negative after the
 * `+ 1`, followed by a mantissa long enough to push `power` below zero. That is
 * a narrow shape, which is exactly why this is worth reporting: a hit means the
 * freeze had a real trigger in production data, and a miss over a few days
 * means the loop was reachable but never reached.
 *
 * Deliberately transcribed rather than reasoned about. The predicate has to
 * agree with the code that shipped, not with a description of it.
 */
export const wouldHaveHung = (value: string | number): boolean => {
  const data = String(value).split(/[eE]/);
  if (data.length !== 2) return false;

  const exponent = Number(data[1]);
  if (!Number.isFinite(exponent)) return false;

  let power = exponent + 1;
  // The negative branch counted UPWARDS to zero and always terminated.
  if (power < 0) return false;

  power -= data[0].replace(".", "").length;
  return power < 0;
};
