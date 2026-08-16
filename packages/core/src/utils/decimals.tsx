import * as React from "react";
import * as Sentry from "@sentry/nextjs";

import { expandExponent, wouldHaveHung } from "./expandExponent";
import { formatDecimal, formatWithSeparators } from "./formatDecimal";

export interface DecimalProps {
  /**
   * Number of digits after dot
   */
  fixed: number;
  /**
   * thousands separator
   */
  thousSep?: string;
  /**
   * float separator
   */
  floatSep?: string;
  /**
   * Number to format
   */
  children?: string | number;
  /**
   * Children's previous value.
   * If undefined, only integer part of the number is highlighted
   */
  prevValue?: string | number;
  hasStyle?: boolean;
}

/**
 * Report an input that would have hung the old formatter, once per session.
 *
 * THIS IS THE LOOP THAT FROZE THE TRADING PAGE. The old expansion counted zeros
 * with `while (power--)`, which terminates only by reaching zero from above.
 * Any input that made `power` negative counted away from zero forever while
 * appending to a string: `"9.99e0"`, `"1.23e1"`, `"1.2345e2"` - anything whose
 * mantissa has more digits than the exponent accounts for. `String(number)`
 * cannot produce those, but a STRING from the API can, and prices, quantities
 * and balances all arrive as strings.
 *
 * The expansion now lives in expandExponent.ts and the formatter in
 * formatDecimal.ts, both import-free and tested against the inputs that hung.
 *
 * WHY THE MESSAGE
 * The fix proves the loop was REACHABLE, not that it was REACHED. One
 * deduplicated report tells us whether such a value actually arrives in
 * production, which is the difference between "this was the freeze" and "this
 * was a freeze waiting to happen". At most one message per session.
 *
 * `wouldHaveHung`, NOT "is exponential". Most exponential values were always
 * harmless - `String(1e-8)` is `"1e-8"` and every dust balance produces one, so
 * the broader check would send a message per rendered number. That mistake was
 * caught by a test rather than by review.
 */
let dangerousInputReported = false;

const reportDangerousInput = (value: string) => {
  if (dangerousInputReported) return;
  dangerousInputReported = true;
  try {
    Sentry.captureMessage("Value that would have hung the decimal formatter", {
      level: "info",
      tags: { formatter: "decimal" },
      // The value itself: a price or quantity, not user identity. Which shape
      // arrives is the entire point of the report.
      extra: { value, expanded: expandExponent(value) },
    });
  } catch {
    // Telemetry must never break rendering. This sits on the path of every
    // number on screen.
  }
};

/**
 * Kept exported: other modules import it. Now a thin wrapper over the tested
 * expansion, with the reporting attached.
 */
const handleRemoveExponent = (value: DecimalProps["children"]) => {
  const input = String(value ?? "");
  if (wouldHaveHung(input)) reportDangerousInput(input);
  return expandExponent(input);
};

class Decimal extends React.Component<DecimalProps> {
  public static format(
    value: DecimalProps["children"],
    precision: number,
    thousSep?: string,
    floatSep?: string
  ) {
    // Delegated to an import-free module so it can be unit tested: this file
    // holds a React component and ts-jest here does not compile JSX, which is
    // why two tab-freezing loops sat in it untested for years.
    return formatDecimal(
      value,
      precision,
      thousSep,
      floatSep,
      reportDangerousInput
    );
  }

  public static getNumberBeforeDot(
    value: DecimalProps["children"],
    fixed: number,
    thousSep?: string,
    floatSep?: string
  ) {
    return Decimal.format(value, 0, thousSep, floatSep);
  }

  public static getNumberAfterDot(
    value: DecimalProps["children"],
    fixed: number,
    thousSep?: string,
    floatSep?: string
  ) {
    if (fixed === 0) {
      return;
    }

    const str = Decimal.format(value, fixed);
    let floatNum = str.slice(str.indexOf("."));

    if (floatSep) {
      floatNum = floatNum.replace(".", floatSep);
    }

    return floatNum;
  }

  public render() {
    const {
      children,
      fixed,
      prevValue,
      thousSep,
      floatSep,
      hasStyle = true,
    } = this.props;

    if (prevValue) {
      return this.highlightNumbers(
        children,
        prevValue,
        fixed,
        thousSep,
        floatSep
      );
    } else {
      return (
        <React.Fragment>
          <span>
            {Decimal.getNumberBeforeDot(children, fixed, thousSep, floatSep)}
          </span>
          <span>{Decimal.getNumberAfterDot(children, fixed)}</span>
        </React.Fragment>
      );
    }
  }

  private highlightNumbers = (
    value: DecimalProps["children"],
    prevValue: DecimalProps["children"],
    fixed: number,
    thousSep?: string,
    floatSep?: string
  ) => {
    let val = Decimal.format(value, fixed, thousSep, floatSep);
    let prev = Decimal.format(prevValue, fixed, thousSep, floatSep);
    let highlighted = "";

    while (val !== prev && val.length > 0) {
      highlighted = val[val.length - 1] + highlighted;
      val = val.slice(0, -1);
      prev = prev.slice(0, -1);
    }

    return (
      <React.Fragment>
        <span className="cr-decimal__opacity">{val}</span>
        <span>{highlighted}</span>
      </React.Fragment>
    );
  };
}

export { Decimal, formatWithSeparators, handleRemoveExponent };
