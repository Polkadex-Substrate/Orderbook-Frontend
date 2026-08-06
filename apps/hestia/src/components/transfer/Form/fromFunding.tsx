"use client";

import { AccountInfo, InlineAccountCard } from "../../ui/ReadyToUse";

import { Card } from "./card";

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
  /*
   * No USDT special case any more. This used to run picoScale (x 1e-12) on USDT
   * only, on top of fetchOnChainBalance already dividing by the asset's on-chain
   * metadata decimals - so USDT was scaled twice and rendered 1e12 too small.
   * See the note on the deleted picoScale helper.
   */
  const formattedExtensionAccountBalance = extensionAccountBalance;

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
        balance={
          fromFunding ? formattedExtensionAccountBalance : localAccountBalance
        }
      >
        {((fromFunding && !isExtensionAccountPresent) ||
          (!fromFunding && !isLocalAccountPresent)) && (
          <InlineAccountCard>Account not present</InlineAccountCard>
        )}
      </AccountInfo>
    </Card>
  );
};
