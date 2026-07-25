import { Typography, Separator, HoverCard } from "@mitra/ux";
import { RiArrowDownSLine } from "@remixicon/react";
import { useState } from "react";

import { Icons } from "..";

import { ResponsiveCard } from "./responsiveCard";

export const TradingFee = ({
  takerFee = "0.1",
  makerFee = "0.1",
  ticker = "PDEX",
}: {
  takerFee?: string;
  makerFee?: string;
  ticker: string;
  readMoreLink?: string;
}) => {
  const [open, setOpen] = useState(false);

  if (!ticker) return <div />;
  return (
    <HoverCard open={open} onOpenChange={setOpen}>
      <HoverCard.Trigger
        className="group"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <div className="flex items-center gap-1">
          <Icons.Fuel className="w-3 h-3 text-placeholder" />
          <Typography.Text size="xs" appearance="primary">
            0.1&#37;
          </Typography.Text>
          <RiArrowDownSLine className="w-3 h-3 text-primary group-hover:rotate-180 duration-300 transition-transform" />
        </div>
      </HoverCard.Trigger>
      <HoverCard.Content className="max-w-[300px] p-4">
        <div className="flex flex-col gap-3">
          <ResponsiveCard label="Taker fee">{takerFee}&#37;</ResponsiveCard>
          <ResponsiveCard label="Maker fee">{makerFee}&#37;</ResponsiveCard>
        </div>
        <Separator.Horizontal className="my-3" />
        <div>
          <Typography.Paragraph
            size="xs"
            appearance="primary"
            className="leading-5"
          >
            Trading fees are vital for Orderbook&apos;s growth. They are charged
            by the Polkadex network as a percentage of trading volume.
          </Typography.Paragraph>
        </div>
      </HoverCard.Content>
    </HoverCard>
  );
};
