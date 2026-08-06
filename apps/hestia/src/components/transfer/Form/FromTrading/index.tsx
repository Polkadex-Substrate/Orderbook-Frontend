"use client";

import {
  Skeleton,
  Typography,
  truncateString,
  AccountCombobox,
} from "@polkadex/ux";
import { Dispatch, Fragment, PropsWithChildren, SetStateAction } from "react";
import { ExtensionAccount } from "@polkadex/react-providers";

import { InlineAccountCard } from "../../../ui/ReadyToUse";
import { Card } from "../card";
import { AvailableMessage } from "../availableMessage";

import { SwitchType } from "@/hooks";

export const FromTrading = ({
  isBalanceFetching,
  isExtensionAccountPresent,
  fromFunding,
  extensionAccountName,
  extensionAccountAddress,
  extensionAccountBalance = "0",
  localAccountBalance = "0",
  selectedAssetTicker = "",
  isFundingToFunding,
  onChangeDirection,
  selectedExtensionAccount,
  setSelectedExtensionAccount,
  type,
}: {
  fromFunding?: boolean;
  isBalanceFetching: boolean;
  extensionAccountName?: string;
  extensionAccountAddress?: string;
  extensionAccountBalance?: string;
  localAccountBalance?: string;
  selectedAssetTicker?: string;
  isExtensionAccountPresent?: boolean;
  isFundingToFunding?: boolean;
  onChangeDirection: (e: SwitchType) => void;
  selectedExtensionAccount: ExtensionAccount | null;
  setSelectedExtensionAccount: Dispatch<
    SetStateAction<ExtensionAccount | null>
  >;
  type: SwitchType;
}) => {
  const accountNotPresent = !fromFunding && !isExtensionAccountPresent;

  const balance = fromFunding ? localAccountBalance : extensionAccountBalance;
  const shortAddress = truncateString(extensionAccountAddress ?? "");

  const typeTitle: Record<SwitchType, string> = {
    deposit: "Trading Account",
    withdraw: "Funding Account",
    transfer: "Another Funding Account",
  };

  return (
    <Card
      label="To"
      title={typeTitle[type]}
      onChangeDirection={onChangeDirection}
    >
      <RenderConditional
        isFundingToFunding={!!isFundingToFunding}
        accountNotPresent={accountNotPresent}
        selectedExtensionAccount={selectedExtensionAccount}
        setSelectedExtensionAccount={setSelectedExtensionAccount}
      >
        <div className="flex justify-between gap-2 flex-wrap px-5 py-3 border-t border-primary">
          {fromFunding ? (
            <AvailableMessage />
          ) : (
            <InlineAccountCard
              loading={!extensionAccountAddress && !extensionAccountName}
            >
              <strong>{extensionAccountName}</strong> {shortAddress}
            </InlineAccountCard>
          )}

          <Skeleton loading={isBalanceFetching} className="h-auto max-w-20">
            <Typography.Text
              appearance="primary"
              size="xs"
              className="self-center whitespace-nowrap"
            >
              {balance} {selectedAssetTicker}
            </Typography.Text>
          </Skeleton>
        </div>
      </RenderConditional>
    </Card>
  );
};

const RenderConditional = ({
  isFundingToFunding,
  accountNotPresent,
  selectedExtensionAccount,
  setSelectedExtensionAccount,
  children,
}: PropsWithChildren<{
  isFundingToFunding: boolean;
  accountNotPresent: boolean;
  selectedExtensionAccount: ExtensionAccount | null;
  setSelectedExtensionAccount: Dispatch<
    SetStateAction<ExtensionAccount | null>
  >;
}>) => {
  if (isFundingToFunding)
    return (
      <div className="px-5 py-3 border-t border-primary">
        <AccountCombobox
          account={selectedExtensionAccount}
          setAccount={(e) => e && setSelectedExtensionAccount(e)}
        />
      </div>
    );
  else if (accountNotPresent)
    return (
      <div className="px-5 py-3 border-t border-primary">
        <InlineAccountCard>Account not present</InlineAccountCard>
      </div>
    );

  return <Fragment>{children}</Fragment>;
};
