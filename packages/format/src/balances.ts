import { trimFloat, parseScientific } from "@polkadex/numericals";

export class BalanceFormatter {
  static toHuman(
    value: number | bigint,
    decimal: number,
    locale?: string
  ): string {
    let result = parseScientific(value.toString());
    // Trim the value (don't round off)
    result = trimFloat({ value: result, digitsAfterDecimal: 8 });

    return result;
  }
}
