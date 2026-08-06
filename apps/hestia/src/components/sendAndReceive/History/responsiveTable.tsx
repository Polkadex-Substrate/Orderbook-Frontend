import { Drawer, Token, Typography } from "@polkadex/ux";
import { Dispatch, SetStateAction, useMemo } from "react";

import { LinkCard } from "./linkCard";

import { ResponsiveCard, StatusCard } from "@/components/ui/ReadyToUse";
import { formatedDate } from "@/helpers";
import { Transaction } from "@/hooks";

export const ResponsiveTable = ({
  open,
  onOpenChange,
  data,
}: {
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  data: Transaction | null;
}) => {
  const { asset, amount, status = "", timestamp, hash } = data ?? {};
  const ready = useMemo(
    () => ["CLAIMED", "APPROVED", "READY"].includes(status),
    [status]
  );

  const date = useMemo(
    () => timestamp && formatedDate(new Date(timestamp), false),
    [timestamp]
  );

  if (!data) return null;

  return (
    <Drawer
      closeOnClickOutside
      shouldScaleBackground={false}
      open={open}
      onOpenChange={onOpenChange}
    >
      <Drawer.Title className="px-4">Transaction info</Drawer.Title>
      <Drawer.Content className="flex flex-col gap-4 p-4">
        <ResponsiveCard label="Token">
          <div className="flex items-center gap-1">
            <Token
              name={asset?.ticker ?? ""}
              className="bg-level-0 max-sm:hidden"
              rounded
              bordered
              size="xs"
            />
            <Typography.Text>{asset?.ticker}</Typography.Text>
          </div>
        </ResponsiveCard>
        <ResponsiveCard label="Status">
          <StatusCard status={ready ? "Completed" : "Pending"} />
        </ResponsiveCard>
        <ResponsiveCard label="Amount">{amount?.toFormat()}</ResponsiveCard>
        <ResponsiveCard label="Hash">
          <LinkCard value={hash} />
        </ResponsiveCard>
        <ResponsiveCard label="Date">{date}</ResponsiveCard>
      </Drawer.Content>
    </Drawer>
  );
};
