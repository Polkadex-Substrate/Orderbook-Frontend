"use client";

import {
  Copy,
  Interaction,
  Loading,
  Modal,
  Skeleton,
  Typography,
  truncateString,
  ResponsiveCard,
  HoverInformation,
} from "@polkadex/ux";
import classNames from "classnames";
import {
  RiFileCopyLine,
  RiGasStationLine,
  RiInformationFill,
} from "@remixicon/react";
import { Dispatch, SetStateAction, useMemo, useState } from "react";
import {
  CrossChainError,
  PALLET_ADDRESS,
  THEA_WITHDRAW_FEE,
  parseScientific,
} from "@orderbook/core/index";
import { useDirectWithdrawProvider } from "@orderbook/core/providers/user/sendAndReceive";

import { useWithdraw } from "@/hooks";
import {
  ErrorMessage,
  GenericHorizontalItem,
  Terms,
} from "@/components/ui/ReadyToUse";
import { formatAmount } from "@/helpers";

interface Props {
  openFeeModal: boolean;
  setOpenFeeModal: Dispatch<SetStateAction<boolean>>;
  amount: string;
  onSuccess: () => void;
  showAutoSwap: boolean;
  swapLoading: boolean;
  swapPrice: number;
  minAmount: number;
}

export const ConfirmTransaction = ({
  openFeeModal,
  setOpenFeeModal,
  amount,
  onSuccess,
  showAutoSwap,
  swapLoading,
  swapPrice,
  minAmount,
}: Props) => {
  const [checked, setChecked] = useState(false);
  const {
    sourceAccount,
    destinationAccount,
    transferConfig,
    transferConfigLoading,
    selectedAsset,
    isDestinationPolkadex,
  } = useDirectWithdrawProvider();
  const { destinationFee, sourceFee } = transferConfig ?? {};

  const shortSourceAddress = useMemo(
    () => truncateString(PALLET_ADDRESS, 3),
    []
  );

  const shortDestinationAddress = useMemo(
    () => truncateString(destinationAccount?.address || "", 3),
    [destinationAccount?.address]
  );
  const { mutateAsync, isLoading } = useWithdraw({ onSuccess });

  const error = useMemo(() => {
    if (isDestinationPolkadex) return undefined;
    const autoSwapAmount = showAutoSwap ? swapPrice : 0;

    if (showAutoSwap && !swapPrice)
      return CrossChainError.NOT_ENOUGH_LIQUIDITY_WITHDRAW(
        selectedAsset?.ticker as string
      );

    if (showAutoSwap && +amount <= autoSwapAmount)
      return CrossChainError.AUTO_SWAP(
        String(autoSwapAmount),
        selectedAsset?.ticker as string,
        true
      );
  }, [
    amount,
    isDestinationPolkadex,
    selectedAsset?.ticker,
    showAutoSwap,
    swapPrice,
  ]);

  const disabled = useMemo(
    () => !!error || isLoading || !checked,
    [error, isLoading, checked]
  );

  const [
    destinationFeeAmount,
    destinationFeeTicker,
    sourceFeeAmount,
    sourceFeeTicker,
    estimatedFee,
  ] = useMemo(() => {
    const destValue = destinationFee?.amount ?? 0;
    const sourceValue = sourceFee?.amount ?? 0;
    return [
      destValue ? `~ ${formatAmount(destValue)}` : "Ø",
      destValue ? destinationFee?.ticker : "",
      sourceValue ? `~ ${formatAmount(sourceValue)}` : "Ø",
      sourceValue ? sourceFee?.ticker : "",
      sourceValue ? `~ ${formatAmount(sourceValue)}` : "Ø",
    ];
  }, [
    destinationFee?.amount,
    destinationFee?.ticker,
    sourceFee?.amount,
    sourceFee?.ticker,
  ]);

  return (
    <Modal
      open={openFeeModal}
      onOpenChange={setOpenFeeModal}
      placement="center left"
      className="top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
    >
      <Modal.Content>
        <Loading.Spinner active={isLoading}>
          <Interaction className="w-full gap-2 md:min-w-[24rem] md:max-w-[24rem]">
            <Interaction.Title
              onClose={{ onClick: () => setOpenFeeModal(false) }}
            >
              Confirm Transaction
            </Interaction.Title>
            <Interaction.Content className="flex flex-col p-3">
              <div className="flex flex-col border-b border-primary">
                <GenericHorizontalItem label="Amount">
                  <Typography.Text>
                    {parseScientific(amount.toString())} {selectedAsset?.ticker}
                  </Typography.Text>
                </GenericHorizontalItem>
                <GenericHorizontalItem
                  label="Source Wallet"
                  className="whitespace-nowrap"
                >
                  <Skeleton
                    loading={!sourceAccount}
                    className="min-h-4 max-w-24"
                  >
                    <Copy value={sourceAccount?.address ?? ""}>
                      <div className="flex items-center gap-1">
                        <RiFileCopyLine className="w-3 h-3 text-secondary" />
                        <Typography.Text>
                          {"Polkadex Orderbook"} • {shortSourceAddress}
                        </Typography.Text>
                      </div>
                    </Copy>
                  </Skeleton>
                </GenericHorizontalItem>
                <GenericHorizontalItem
                  label="Destination Wallet"
                  className="whitespace-nowrap"
                >
                  <Copy value={destinationAccount?.address ?? ""}>
                    <div className="flex items-center gap-1">
                      <RiFileCopyLine className="w-3 h-3 text-secondary" />
                      <Typography.Text>
                        {destinationAccount?.name} • {shortDestinationAddress}
                      </Typography.Text>
                    </div>
                  </Copy>
                </GenericHorizontalItem>
                {showAutoSwap && swapPrice > 0 && (
                  <GenericHorizontalItem
                    label="Swap required"
                    tooltip={`In order to withdraw your funds, you must have to transfer at least ${minAmount} ${selectedAsset?.ticker}. A small part of your transfer will be auto-swapped to PDEX to pay the fee.`}
                    defaultOpen
                  >
                    <div className="flex items-center gap-1">
                      <RiGasStationLine className="w-3.5 h-3.5 text-secondary" />
                      <Skeleton loading={swapLoading} className="min-h-4 w-10">
                        <div className="flex items-center gap-1">
                          <Typography.Text>
                            {swapPrice > 0
                              ? `${swapPrice} ${selectedAsset?.ticker}`
                              : "--------"}
                          </Typography.Text>
                          <Typography.Text appearance="primary">
                            ≈
                          </Typography.Text>
                          <Skeleton
                            loading={transferConfigLoading}
                            className="min-h-4 max-w-24"
                          >
                            <Typography.Text appearance="primary">
                              {THEA_WITHDRAW_FEE} PDEX
                            </Typography.Text>
                          </Skeleton>
                        </div>
                      </Skeleton>
                    </div>
                  </GenericHorizontalItem>
                )}
                <HoverInformation>
                  <HoverInformation.Trigger
                    className={classNames(isDestinationPolkadex && "hidden")}
                  >
                    <div className="w-full flex items-center justify-between gap-2 px-3 py-3 cursor-pointer">
                      <div className="flex items-center gap-1">
                        <RiInformationFill className="w-3 h-3 text-actionInput" />
                        <Typography.Text appearance="primary">
                          Estimated fee
                        </Typography.Text>
                      </div>
                      <Skeleton
                        loading={
                          showAutoSwap ? swapLoading : transferConfigLoading
                        }
                        className="min-h-4 w-20 flex-none"
                      >
                        <Typography.Text>
                          {estimatedFee} {sourceFeeTicker}
                        </Typography.Text>
                      </Skeleton>
                    </div>
                  </HoverInformation.Trigger>
                  <HoverInformation.Content>
                    <ResponsiveCard label="Source fee">
                      {sourceFeeAmount} {sourceFeeTicker}
                    </ResponsiveCard>
                    <ResponsiveCard
                      label="Destination fee"
                      loading={transferConfigLoading}
                    >
                      {destinationFeeAmount} {destinationFeeTicker}
                    </ResponsiveCard>
                    {showAutoSwap && swapPrice > 0 && (
                      <ResponsiveCard label="Auto swap">
                        {swapPrice} {selectedAsset?.ticker}
                      </ResponsiveCard>
                    )}
                  </HoverInformation.Content>
                </HoverInformation>
                {error && <ErrorMessage className="p-3">{error}</ErrorMessage>}
              </div>
              <div className="px-3 pt-4">
                <Terms checked={checked} setChecked={setChecked} />
              </div>
            </Interaction.Content>
            <Interaction.Footer>
              <Interaction.Action
                disabled={disabled}
                appearance={disabled ? "secondary" : "primary"}
                onClick={async () => await mutateAsync({ amount })}
              >
                Sign and Submit
              </Interaction.Action>
              <Interaction.Close onClick={() => setOpenFeeModal(false)}>
                Close
              </Interaction.Close>
            </Interaction.Footer>
          </Interaction>
        </Loading.Spinner>
      </Modal.Content>
    </Modal>
  );
};
