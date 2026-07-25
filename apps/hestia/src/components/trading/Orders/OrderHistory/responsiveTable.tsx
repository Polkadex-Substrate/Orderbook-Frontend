import { Copy, Drawer, Typography, truncateString } from "@mitra/ux";
import { Dispatch, SetStateAction } from "react";
import { Order } from "@orderbook/core/utils/orderbookService/types";
import { RiFileCopyLine } from "@remixicon/react";

import { FilledCard, ResponsiveCard } from "@/components/ui/ReadyToUse";
import { formatedDate } from "@/helpers";
export const ResponsiveTable = ({
  open,
  onOpenChange,
  data,
}: {
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  data: Order | null;
}) => {
  if (!data) return null;
  const {
    status,
    type,
    side,
    market,
    price,
    quantity,
    filledQuantity,
    timestamp,
    orderId,
    averagePrice,
    fee,
  } = data;
  const date = formatedDate(timestamp, false);
  const percent = (Number(filledQuantity) / Number(quantity)) * 100;
  const isSell = side === "Ask";
  const roundedPercent = Math.min(100, percent).toFixed(2);
  const width = `${roundedPercent}%`;
  const ticker =
    side === "Bid" ? market.baseAsset.ticker : market.quoteAsset.ticker;

  return (
    <Drawer closeOnClickOutside open={open} onOpenChange={onOpenChange}>
      <Drawer.Title className="px-3">{market.name}</Drawer.Title>
      <Drawer.Content className="flex flex-col gap-4 p-4">
        <ResponsiveCard label="ID">
          <Copy value={orderId}>
            <div className="flex items-center gap-1">
              <RiFileCopyLine className="w-4 h-4 text-actionInput" />
              <Typography.Text>{truncateString(orderId, 6)}</Typography.Text>
            </div>
          </Copy>
        </ResponsiveCard>
        <ResponsiveCard label="Date">{date}</ResponsiveCard>
        <ResponsiveCard label="Type">
          <Typography.Text className="first-letter:uppercase" bold>
            {type.toLowerCase()}
          </Typography.Text>
        </ResponsiveCard>
        <ResponsiveCard label="Side">
          <Typography.Text
            className="first-letter:uppercase"
            bold
            appearance={isSell ? "danger" : "success"}
          >
            {isSell ? "Sell" : "Buy"}
          </Typography.Text>
        </ResponsiveCard>
        <ResponsiveCard label="Price">
          {price} {market.quoteAsset.ticker}
        </ResponsiveCard>
        <ResponsiveCard label="Amount">
          {quantity} {market.baseAsset.ticker}
        </ResponsiveCard>
        <ResponsiveCard label="Filled">
          <FilledCard width={width} responsive>
            {filledQuantity} {market.baseAsset.ticker}
          </FilledCard>
        </ResponsiveCard>
        <ResponsiveCard label="Average Price">
          {averagePrice} {market.quoteAsset.ticker}
        </ResponsiveCard>
        <ResponsiveCard label="Fees">
          {fee} {ticker}
        </ResponsiveCard>

        <ResponsiveCard label="Status">
          <Typography.Text
            appearance="primary"
            className="first-letter:uppercase"
          >
            {status.toLowerCase()}
          </Typography.Text>
        </ResponsiveCard>
      </Drawer.Content>
    </Drawer>
  );
};
