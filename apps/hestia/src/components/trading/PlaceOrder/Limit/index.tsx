"use client";

import { Market } from "@orderbook/core/utils/orderbookService/types";

import { BuyOrder } from "./buy";
import { SellOrder } from "./sell";

export const LimitOrder = ({
  market,
  availableQuoteAmount,
  availableBaseAmount,
  isBuy,
  isResponsive,
}: {
  market?: Market;
  availableQuoteAmount: number;
  availableBaseAmount: number;
  isBuy?: boolean;
  isResponsive?: boolean;
}) => {
  if (isResponsive)
    return isBuy ? (
      <BuyOrder
        market={market}
        availableQuoteAmount={availableQuoteAmount}
        isResponsive={isResponsive}
      />
    ) : (
      <SellOrder
        market={market}
        availableBaseAmount={availableBaseAmount}
        isResponsive={isResponsive}
      />
    );

  return (
    <div className="flex flex-auto gap-2 p-2">
      <BuyOrder market={market} availableQuoteAmount={availableQuoteAmount} />
      <SellOrder market={market} availableBaseAmount={availableBaseAmount} />
    </div>
  );
};
