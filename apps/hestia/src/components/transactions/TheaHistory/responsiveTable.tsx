import { Drawer, Token, Typography } from "@polkadex/ux";
import { Dispatch, SetStateAction, useMemo } from "react";

import { ClaimRefundButton } from "./claimRefundButton";

import { NetworkCard } from "./networkCard";
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
  const {
    symbol,
    amount,
    status = "",
    sourceChain,
    destinationChain,
    timestamp,
    transactionHash,
  } = data ?? {};

  const ready = status === "COMPLETED";
  const timedOut = status === "TIMEDOUT";

  const date = useMemo(
    () => timestamp && formatedDate(new Date(Number(timestamp)), false),
    [timestamp],
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
              name={symbol ?? ""}
              className="bg-level-0 max-sm:hidden"
              rounded
              bordered
              size="xs"
            />
            <Typography.Text>{symbol}</Typography.Text>
          </div>
        </ResponsiveCard>
        <ResponsiveCard label="Status">
          <StatusCard
            status={ready ? "Completed" : timedOut ? "Timed Out" : "Pending"}
          />
        </ResponsiveCard>
        {timedOut && data && (
          <ResponsiveCard label="Refund">
            <ClaimRefundButton transaction={data} />
          </ResponsiveCard>
        )}
        <ResponsiveCard label="Amount">{amount}</ResponsiveCard>
        <ResponsiveCard label="From">
          <NetworkCard name={sourceChain} />
        </ResponsiveCard>
        <ResponsiveCard label="To">
          <NetworkCard name={destinationChain} />
        </ResponsiveCard>
        <ResponsiveCard label="Hash">
          <LinkCard value={transactionHash} sourceChain={sourceChain} />
        </ResponsiveCard>
        <ResponsiveCard label="Date">{date}</ResponsiveCard>
      </Drawer.Content>
    </Drawer>
  );
};
