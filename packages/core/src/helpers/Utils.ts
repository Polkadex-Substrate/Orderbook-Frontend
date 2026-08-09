import { MAX_DIGITS_AFTER_DECIMAL } from "@orderbook/core/constants";

export function decimalPlaces(num: number | string) {
  const match = ("" + num).match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
  if (!match) {
    return 0;
  }
  return Math.max(
    0,
    // Number of digits right of decimal point.
    (match[1] ? match[1].length : 0) -
      // Adjust for scientific notation.
      (match[2] ? +match[2] : 0)
  );
}

// Removes the commas from a number
export const getAbsoluteNumber = (value: string | number) => {
  const valueStr = value.toString();
  return parseFloat(valueStr.replace(/,/g, ""));
};

export const getDigitsAfterDecimal = (value: number | string) => {
  const amountStr = String(value);
  return amountStr.includes(".") ? amountStr.split(".")[1].length : 0;
};

export const hasOnlyZeros = (floatString: string): boolean => {
  const floatValue = parseFloat(floatString);
  const integerValue = parseInt(floatString, 10);

  return floatValue === integerValue;
};

/**
 * Trim trailing zeros from a numeric string.
 *
 * Declared `value: string` but reached at runtime with undefined - a MARKET
 * order carries no price, and the caller passes it straight through. The
 * unguarded `.replace` then threw inside an async submit handler with nothing
 * to catch it, which is the shape of POLKADEX-ORDERBOOK-FE-TEST-9: an
 * unhandled rejection out of `onSubmit`, 29 times in three minutes while the
 * user retried a button that gave no reason for failing.
 *
 * Total on purpose: an absent value becomes "", which the payload builder
 * rejects with a named error, instead of a TypeError from library depths.
 */
export const formatNumber = (
  value: string | number | null | undefined
): string => {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/(\.\d*?)0+$/, "$1") // Remove trailing zeros after the decimal
    .replace(/\.$/, ""); // Remove the deciaml point if there are no decimal places)
};

type TrimFloatProps = {
  value: string | number;
  digitsAfterDecimal?: number;
};

export const trimFloat = ({
  value,
  digitsAfterDecimal = MAX_DIGITS_AFTER_DECIMAL,
}: TrimFloatProps): string => {
  const valueString = value.toString();
  const decimalIndex = valueString.indexOf(".");

  if (decimalIndex !== -1) {
    const numberPart = valueString.substr(
      0,
      decimalIndex + digitsAfterDecimal + 1
    );
    return formatNumber(parseFloat(numberPart).toFixed(digitsAfterDecimal));
  }

  return formatNumber(valueString);
};

export const secondsToHm = (seconds: number) => {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const dDisplay = d > 0 ? d + "d " : "";
  const hDisplay = h > 0 ? h + (h === 1 ? "hr " : "hrs ") : "";
  const mDisplay = m > 0 ? m + (m === 1 ? "min " : "mins ") : "";
  const sDisplay = s > 0 ? s + (s === 1 ? "sec" : "secs") : "";
  const dhm = dDisplay + hDisplay + mDisplay;
  if (dhm.trim().length === 0) return sDisplay;
  return dhm;
};

// * Credit goes to https://github.com/balancer/balancer-v2-monorepo/blob/8b5773510dfc7a94d4eef3e22d1de50becb0250d/lib/helpers/numbers.ts#L57-L86 for providing the solution.
export function parseScientific(num: string): string {
  // If the number is not in scientific notation return it as it is.
  if (!/\d+\.?\d*e[+-]*\d+/i.test(num)) {
    return num;
  }

  // Remove the sign.
  const numberSign = Math.sign(Number(num));
  num = Math.abs(Number(num)).toString();

  // Parse into coefficient and exponent.
  const [coefficient, exponent] = num.toLowerCase().split("e");
  let zeros = Math.abs(Number(exponent));
  const exponentSign = Math.sign(Number(exponent));
  const [integer, decimals] = (
    coefficient.indexOf(".") !== -1 ? coefficient : `${coefficient}.`
  ).split(".");

  if (exponentSign === -1) {
    zeros -= integer.length;
    num =
      zeros < 0
        ? integer.slice(0, zeros) + "." + integer.slice(zeros) + decimals
        : "0." + "0".repeat(zeros) + integer + decimals;
  } else {
    if (decimals) zeros -= decimals.length;
    num =
      zeros < 0
        ? integer + decimals.slice(0, zeros) + "." + decimals.slice(zeros)
        : integer + decimals + "0".repeat(zeros);
  }

  return numberSign < 0 ? "-" + num : num;
}
