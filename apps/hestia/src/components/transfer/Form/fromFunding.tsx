"use client";

import { useMemo } from "react";
import { AccountInfo, InlineAccountCard } from "../../ui/ReadyToUse";

import { Card } from "./card";
import { picoScale } from "@/helpers";

export const FromFunding = ({
  isExtensionAccountPresent,
  isLocalAccountPresent,
  isBalanceFetching,
  focused,
  fromFunding,
  extensionAccountName,
  extensionAccountAddress,
  extensionAccountBalance = "0",
  localAccountName,
  localAccountAddress,
  localAccountBalance = "0",
  selectedAssetTicker = "",
}: {
  isExtensionAccountPresent?: boolean;
  isLocalAccountPresent?: boolean;
  isBalanceFetching: boolean;
  focused?: boolean;
  fromFunding?: boolean;
  extensionAccountName?: string;
  extensionAccountAddress?: string;
  extensionAccountBalance?: string;
  localAccountName?: string;
  localAccountAddress?: string;
  localAccountBalance?: string;
  selectedAssetTicker?: string;
}) => {

  const formattedExtensionAccountBalance = selectedAssetTicker === 'USDT' ? useMemo(() => picoScale(extensionAccountBalance), [extensionAccountBalance]) : extensionAccountBalance;

  return (
    <Card
      active={focused}
      label="From"
      title={fromFunding ? "Funding Account" : "Trading Account"}
    >
      <AccountInfo
        name={fromFunding ? extensionAccountName : localAccountName}
        address={fromFunding ? extensionAccountAddress : localAccountAddress}
        ticker={selectedAssetTicker}
        isBalanceFetching={isBalanceFetching}
        balance={fromFunding ? formattedExtensionAccountBalance : localAccountBalance}
      >
        {((fromFunding && !isExtensionAccountPresent) ||
          (!fromFunding && !isLocalAccountPresent)) && (
          <InlineAccountCard>Account not present</InlineAccountCard>
        )}
      </AccountInfo>
    </Card>
  );
};
