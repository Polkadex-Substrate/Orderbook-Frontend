import { parseScientific } from "@orderbook/core/helpers";
import { trimFloat } from "@polkadex/numericals";
// NAN with 2,804
export const formatAmount = (amount: number) => {
  const trimmedBalance = trimFloat({
    value: parseScientific(amount.toString()),
  });
  return trimmedBalance;
};
