"use client";

import {
  GenericMessage,
  Accordion,
  Tokens,
  Button,
  Spinner,
} from "@mitrabook/ux";
import { useMemo } from "react";
import {
  useCall,
  useTransactionFeeModal,
  useTransactions,
} from "@orderbook/core/hooks";
import { WithdrawGroup, WithdrawGroupItem } from "@orderbook/core/helpers";
import { intlFormat } from "date-fns";
import { useWithdrawsProvider } from "@orderbook/core/providers/user/withdrawsProvider";
import { useConnectWalletProvider } from "@orderbook/core/providers/user/connectWalletProvider";

import { Table } from "./table";

import { BatchCard, SkeletonCollection } from "@/components/ui/ReadyToUse";
import { ConfirmTransaction } from "@/components/ui/ConnectWallet/confirmTransaction";
export interface ReadyToClaimProps extends WithdrawGroupItem {
  token: {
    name: string;
    ticker: string;
    assetId: string;
  };
  wallets: {
    fromWalletType: string;
    fromWalletName: string;
    fromWalletAddress: string;
    toWalletType: string;
  };
}

export interface ReadyToClaimDataProps extends Omit<WithdrawGroup, "items"> {
  items: ReadyToClaimProps[];
}

// Plain component: was forwardRef but ignored the ref and no caller
// passed one - triggered React's forwardRef-arity warning on mount.
export const ReadyToClaim = ({ maxHeight }: { maxHeight: string }) => {
  const { loading, readyWithdrawals } = useTransactions();
  const { onFetchClaimWithdraw, claimsInLoading } = useWithdrawsProvider();

  const { selectedWallet } = useConnectWalletProvider();
  const readyWithdrawalsData = useMemo(
    () =>
      readyWithdrawals.map((e) => {
        const items = e.items?.map((e) => {
          const token = e.asset;
          return {
            ...e,
            time: intlFormat(
              new Date(e.time),
              {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              },
              { locale: "EN" }
            ),
            token: {
              ticker: token?.ticker,
              name: token?.name,
              assetId: token?.id,
            },
            wallets: {
              fromWalletType: "Trading Account",
              fromWalletName: selectedWallet?.name ?? "",
              fromWalletAddress: selectedWallet?.address ?? "",
              toWalletType: "Funding Account",
            },
          };
        });
        return {
          ...e,
          items,
        } as ReadyToClaimDataProps;
      }),
    [readyWithdrawals, selectedWallet?.name, selectedWallet?.address]
  );

  const {
    openFeeModal,
    onOpenFeeModal,
    setOpenFeeModal,
    tokenFee,
    setTokenFee,
  } = useTransactionFeeModal();
  const { onClaimWithdrawOcex } = useCall();
  if (loading) return <SkeletonCollection />;

  return (
    <div className="flex-1 flex flex-col">
      {readyWithdrawalsData.length ? (
        <div className="flex-1 flex flex-col justify-between border-b border-secondary-base min-h-40">
          <div
            className="overflow-y-hidden hover:overflow-y-auto px-3"
            style={{ maxHeight, scrollbarGutter: "stable" }}
          >
            <Accordion type="multiple">
              {readyWithdrawalsData.map((value) => {
                const tickersSet = new Set(
                  value.items.map((v) => v.asset.ticker)
                );
                const icons = Array.from(tickersSet);
                const totalAmountSum =
                  icons.length === 1 &&
                  value.items.reduce(
                    (acc, curr) => acc + Number(curr.amount),
                    0
                  );

                const transactionLoading = claimsInLoading.includes(value.sid);
                const transactionsNum = `${value.items.length} Transactions`;
                const totalAmount = totalAmountSum
                  ? `(${totalAmountSum} ${icons[0]})`
                  : "";

                const assetIds = value.items.map((e) => e.token.assetId);

                return (
                  <Accordion.Item value={value.id.toString()} key={value.id}>
                    <Accordion.Trigger className=" items-center py-4 border-b border-primary bg-level-0">
                      <div className="flex items-center justify-between flex-1">
                        <ConfirmTransaction
                          action={() => {
                            onFetchClaimWithdraw({
                              sid: value.sid,
                              assetIds,
                              tokenFeeId: tokenFee?.id,
                              selectedWallet,
                            });
                          }}
                          actionLoading={!!transactionLoading}
                          extrinsicFn={() =>
                            onClaimWithdrawOcex([
                              value.sid as unknown as number,
                              assetIds as unknown as Uint8Array,
                            ])
                          }
                          sender={selectedWallet?.address ?? ""}
                          tokenFee={tokenFee}
                          setTokenFee={setTokenFee}
                          openFeeModal={openFeeModal}
                          setOpenFeeModal={setOpenFeeModal}
                        />
                        <BatchCard
                          icons={icons as (keyof typeof Tokens)[]}
                          title={`Batch ${value.sid}`}
                          description={`${transactionsNum} ${totalAmount}`}
                        />
                        <Button.Solid
                          size="sm"
                          disabled={transactionLoading}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onOpenFeeModal();
                          }}
                        >
                          {transactionLoading ? (
                            <div className="px-8">
                              <Spinner.Keyboard className="w-4 h-4" />
                            </div>
                          ) : (
                            "Claim tokens"
                          )}
                        </Button.Solid>
                      </div>
                      <Accordion.Icon />
                    </Accordion.Trigger>
                    <Accordion.Content className="border-b border-primary">
                      <Table data={value.items} />
                    </Accordion.Content>
                  </Accordion.Item>
                );
              })}
            </Accordion>
          </div>
        </div>
      ) : (
        <GenericMessage
          title="No result found"
          illustration="NoResultFound"
          className="bg-level-1 border-b border-b-primary"
          imageProps={{
            className: "w-10 self-center",
          }}
        />
      )}
    </div>
  );
};
