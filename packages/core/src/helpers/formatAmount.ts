// Move - Polkadex-ts
import { parseScientific } from "@orderbook/core/helpers";
import { trimFloat } from "@mitra/numericals";

export const formatAmount = (amount: number) => {
  const trimmedBalance = +trimFloat({ value: amount });
  return parseScientific(trimmedBalance.toString());
};
