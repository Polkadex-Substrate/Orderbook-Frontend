/**
 * Is this string a plain decimal amount a user could have meant to type?
 *
 * THE BUG THIS FIXES (reported 2026-08-10)
 * Suresh had 0.148 ETH, tried to bridge `.12`, and got "Must be a number".
 * `.12` is a number. Every amount field in the app used this regex:
 *
 *     /^\d+(\.\d+)?$/
 *
 * `\d+` requires at least one digit BEFORE the decimal point, so a leading-dot
 * amount is rejected. That is one of the two most common ways people type a
 * fraction, and it is the natural one when the value is smaller than one - which
 * on a testnet, where balances are fractions of an ETH, is most of the time.
 *
 * The same regex was copy-pasted into SEVEN places: bridge, deposit, withdraw,
 * limit-order price, limit-order amount, limit-order total, market-order amount.
 * All seven had the bug. Hence one predicate, imported by all of them, so the
 * next correction lands everywhere at once.
 *
 * WHY THE ERROR WAS ESPECIALLY BAD HERE
 * "Must be a number" tells the user their input is the wrong KIND of thing. It
 * is not - it is the right kind, in a shape we declined to parse. So the message
 * sends them looking for a mistake that is not there. Suresh reported it twice,
 * eleven minutes apart, because there was nothing about `.12` to fix.
 *
 * Import-free so it is testable without yup, a form, or a renderer.
 */

/**
 * Accepts:
 *   "12"      whole
 *   "12.5"    the usual form
 *   "0.12"    leading zero
 *   ".12"     NO leading zero - the bug
 *   "12."     trailing dot, which is what a half-typed "12.5" looks like
 *
 * Rejects:
 *   ""  "."  ".."  "1.2.3"     not parseable
 *   "-1"  "+1"                 an amount to send is never signed
 *   "1e5"                      Number() would accept it, but nobody types
 *                              scientific notation into an amount box, and it
 *                              makes "Minimum: 0.001" incomprehensible
 *   "1,000"  " 12"  "12 "      separators and whitespace
 *   "１２"             full-width digits, which Number() DOES accept
 *                              (Number("１２") === 12) but which no
 *                              amount field should silently reinterpret
 *   "Infinity"  "NaN"
 */
const AMOUNT = /^(?:\d+(?:\.\d*)?|\.\d+)$/;

export const isAmountLike = (value: unknown): boolean => {
  if (typeof value !== "string") return false;
  if (!AMOUNT.test(value)) return false;
  // Belt and braces: the regex already excludes everything non-finite, so this
  // can only fail if the regex is later loosened. Cheap insurance on a money
  // path.
  return Number.isFinite(Number(value));
};

/**
 * The numeric value, or NaN if the string is not an amount.
 *
 * Callers previously did `Number(value || 0)`, which turns unparseable input
 * into 0 and then compares 0 against the minimum - producing "Minimum amount:
 * X" for input that was never a number at all. Returning NaN keeps "not a
 * number" and "too small" as different answers.
 */
export const amountValue = (value: unknown): number =>
  isAmountLike(value) ? Number(value) : Number.NaN;
