"use client";

import { Skeleton, Typography, truncateString } from "@polkadex/ux";
import { PropsWithChildren } from "react";

import { InlineAccountCard } from "./inlineAccountCard";
export const AccountInfo = ({
  name,
  address,
  ticker,
  balance,
  isBalanceFetching,
  children,
}: PropsWithChildren<{
  name?: string;
  address?: string;
  ticker: string;
  isBalanceFetching: boolean;
  balance: string | number;
}>) => {
  const shortAddress = address && truncateString(address);
  return (
    <div className="flex justify-between gap-2 flex-wrap px-5 py-3 border-t border-primary">
      {children || (
        <InlineAccountCard loading={!address && !name}>
          <strong>{name}</strong> {shortAddress}
        </InlineAccountCard>
      )}
      <Skeleton loading={isBalanceFetching} className="h-auto max-w-20">
        <Typography.Text
          appearance="primary"
          size="xs"
          className="self-center whitespace-nowrap"
        >
          {balance} {ticker}
        </Typography.Text>
      </Skeleton>
    </div>
  );
};
