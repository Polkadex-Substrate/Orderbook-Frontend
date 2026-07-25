import { LmpLeaderboard } from "@orderbook/core/hooks";
import { Drawer, Typography, truncateString } from "@mitra/ux";
import { Dispatch, SetStateAction } from "react";
import { trimFloat } from "@mitra/numericals";

import { ResponsiveCard } from "@/components/ui/ReadyToUse";

export const ResponsiveTable = ({
  open,
  onOpenChange,
  data,
}: {
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  data: LmpLeaderboard | null;
}) => {
  if (!data) return null;
  return (
    <Drawer
      closeOnClickOutside
      open={open}
      onOpenChange={onOpenChange}
      shouldScaleBackground={false}
    >
      <Drawer.Title className="px-4">
        <Typography.Heading size="base">Rank # {data.rank}</Typography.Heading>
      </Drawer.Title>
      <Drawer.Content className="flex flex-col gap-4 p-4">
        <ResponsiveCard label="Account">
          {truncateString(data.address)}
        </ResponsiveCard>
        <ResponsiveCard label="Rewards">
          {trimFloat({
            value: data.rewards,
            digitsAfterDecimal: 4,
          })}{" "}
          {data.token}
        </ResponsiveCard>
        <ResponsiveCard label="MM Score">
          {trimFloat({
            value: data.mmScore,
            digitsAfterDecimal: 6,
          })}
        </ResponsiveCard>
        <ResponsiveCard label="Trading Score">
          {trimFloat({
            value: data.tradingScore,
            digitsAfterDecimal: 6,
          })}
        </ResponsiveCard>
      </Drawer.Content>
    </Drawer>
  );
};
