import { Copy, Drawer, Typography, truncateString } from "@mitra/ux";
import { Dispatch, SetStateAction } from "react";
import { intlFormat } from "date-fns";
import { Order } from "@orderbook/core/utils/orderbookService/types";
import { RiFileCopyLine } from "@remixicon/react";

import { FilledCard, ResponsiveCard } from "@/components/ui/ReadyToUse";

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
    price,
    timestamp,
    orderId,
    market,
    side,
    type,
    quantity,
    filledQuantity,
    averagePrice,
    status,
    fee,
  } = data;
  const isSell = side === "Ask";
  const title = `${type}/${isSell ? "Sell" : "Buy"}`;
  const ticker =
    side === "Bid" ? market.baseAsset.ticker : market.quoteAsset.ticker;
  const isMarket = type === "MARKET";

  const percent = (Number(filledQuantity) / Number(quantity)) * 100;
  const roundedPercent = Math.min(100, percent).toFixed(2);
  const width = `${roundedPercent}%`;

  return (
    <Drawer
      closeOnClickOutside
      open={open}
      onOpenChange={onOpenChange}
      shouldScaleBackground={false}
    >
      <Drawer.Title className="px-4">
        <Typography.Heading size="base">
          Order ID # {truncateString(orderId, 6)}
        </Typography.Heading>
      </Drawer.Title>
      <Drawer.Content className="flex flex-col gap-4 p-4">
        <ResponsiveCard label="Order ID">
          <Copy value={orderId}>
            <div className="flex items-center gap-1">
              <RiFileCopyLine className="w-4 h-4 text-actionInput" />
              <Typography.Text>{truncateString(orderId, 6)}</Typography.Text>
            </div>
          </Copy>
        </ResponsiveCard>
        <ResponsiveCard label="Date">
          <Typography.Text>
            {intlFormat(
              new Date(timestamp),
              {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              },
              { locale: "EN" }
            ).replace(",", "")}
          </Typography.Text>
        </ResponsiveCard>
        <ResponsiveCard label="Pair">
          <Typography.Text bold>{market.name}</Typography.Text>
        </ResponsiveCard>
        <ResponsiveCard label="Type">
          <Typography.Text
            bold
            appearance={isSell ? "danger" : "success"}
            className="uppercase"
          >
            {title}
          </Typography.Text>
        </ResponsiveCard>
        <ResponsiveCard label="Status">
          <Typography.Text>{status}</Typography.Text>
        </ResponsiveCard>
        <ResponsiveCard label="Price">
          <Typography.Text>
            {isMarket ? "---" : `${price} ${market.quoteAsset.ticker}`}
          </Typography.Text>
        </ResponsiveCard>
        <ResponsiveCard label="Amount">
          <Typography.Text>
            {quantity} {market.baseAsset.ticker}
          </Typography.Text>
        </ResponsiveCard>
        <ResponsiveCard label="Filled">
          <FilledCard responsive width={width}>
            {filledQuantity} {market.baseAsset.ticker}
          </FilledCard>
        </ResponsiveCard>
        <ResponsiveCard label="Average Price">
          <Typography.Text>
            {averagePrice} {market.quoteAsset.ticker}
          </Typography.Text>
        </ResponsiveCard>

        <ResponsiveCard label="Fee">
          <Typography.Text>
            {fee} {ticker}
          </Typography.Text>
        </ResponsiveCard>
      </Drawer.Content>
    </Drawer>
  );
};
