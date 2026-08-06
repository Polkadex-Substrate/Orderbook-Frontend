import { Copy, Drawer, Typography, truncateString } from "@mitrabook/ux";
import { Dispatch, SetStateAction } from "react";
import { Trade } from "@orderbook/core/utils/orderbookService/types";
import { RiFileCopyLine } from "@remixicon/react";

import { ResponsiveCard } from "@/components/ui/ReadyToUse";
import { formatedDate } from "@/helpers";
export const ResponsiveTable = ({
  open,
  onOpenChange,
  data,
}: {
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  data: Trade | null;
}) => {
  if (!data) return null;
  const { side, market, price, timestamp, qty, fee, tradeId } = data;
  const date = formatedDate(timestamp, false);
  const isSell = side === "Ask";
  const ticker =
    side === "Bid" ? market.baseAsset.ticker : market.quoteAsset.ticker;

  return (
    <Drawer closeOnClickOutside open={open} onOpenChange={onOpenChange}>
      <Drawer.Title className="px-3">{market.name}</Drawer.Title>
      <Drawer.Content className="flex flex-col gap-4 p-4">
        <ResponsiveCard label="ID">
          <Copy value={tradeId}>
            <div className="flex items-center gap-1">
              <RiFileCopyLine className="w-4 h-4 text-actionInput" />
              <Typography.Text>{truncateString(tradeId, 6)}</Typography.Text>
            </div>
          </Copy>
        </ResponsiveCard>
        <ResponsiveCard label="Date">{date}</ResponsiveCard>
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
          {qty} {market.baseAsset.ticker}
        </ResponsiveCard>
        <ResponsiveCard label="Fees">
          {fee} {ticker}
        </ResponsiveCard>
      </Drawer.Content>
    </Drawer>
  );
};
