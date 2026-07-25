import { Copy, Drawer, Typography, truncateString } from "@mitra/ux";
import { Dispatch, SetStateAction } from "react";
import { intlFormat } from "date-fns";
import { Trade } from "@orderbook/core/utils/orderbookService/types";
import { RiFileCopyLine } from "@remixicon/react";

import { ResponsiveCard } from "@/components/ui/ReadyToUse";

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
  const { price, timestamp, tradeId, market, qty, side } = data;
  const isSell = side === "Ask";
  const title = isSell ? "Sell" : "Buy";
  return (
    <Drawer
      closeOnClickOutside
      open={open}
      onOpenChange={onOpenChange}
      shouldScaleBackground={false}
    >
      <Drawer.Title className="px-4">
        <Typography.Heading size="base">
          Trade ID # {truncateString(tradeId, 6)}
        </Typography.Heading>
      </Drawer.Title>
      <Drawer.Content className="flex flex-col gap-4 p-4">
        <ResponsiveCard label="Trade ID">
          <Copy value={tradeId}>
            <div className="flex items-center gap-1">
              <RiFileCopyLine className="w-4 h-4 text-actionInput" />
              <Typography.Text>{truncateString(tradeId, 6)}</Typography.Text>
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
        <ResponsiveCard label="Price">
          <Typography.Text>
            {price} {market.quoteAsset.ticker}
          </Typography.Text>
        </ResponsiveCard>
        <ResponsiveCard label="Amount">
          <Typography.Text>
            {qty} {market.baseAsset.ticker}
          </Typography.Text>
        </ResponsiveCard>
      </Drawer.Content>
    </Drawer>
  );
};
