import { parseScientific } from "@orderbook/core/helpers";
import { trimFloat } from "@polkadex/numericals";
// NAN with 2,804
export const formatAmount = (amount: number) => {
  const trimmedBalance = trimFloat({
    value: parseScientific(amount.toString()),
  });
  return trimmedBalance;
};

export function picoScale(amount: number | string): string {
  const parsed = typeof amount === "string" ? parseFloat(amount) : amount;

  if (isNaN(parsed)) {
    throw new Error(`Invalid input: "${amount}" cannot be parsed as a number`);
  }

  return String(parsed * 1e-12);
}