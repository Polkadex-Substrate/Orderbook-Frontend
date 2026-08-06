import { Market } from "../utils/orderbookService/types";

export const getCurrentMarket = (
  markets: Market[],
  defaultMarket: string | null
) => {
  if (markets?.length && defaultMarket) {
    const findMarketByName = markets?.find((v) =>
      v.name
        .replace(/[^a-zA-Z0-9]/g, "")
        .toLowerCase()
        .includes(defaultMarket.toLowerCase())
    );

    const findMarketById = markets?.find((v) => v.id === defaultMarket);

    const defaultMarketSelected =
      findMarketByName ?? findMarketById ?? markets[0];

    return defaultMarketSelected;
  }
};
