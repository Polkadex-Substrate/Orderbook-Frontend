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
import {
  RiFileCopyLine,
  RiGasStationLine,
  RiInformationFill,
} from "@remixicon/react";
import { Dispatch, SetStateAction, useMemo, useState } from "react";
import {
  CrossChainError,
  THEA_AUTOSWAP,
  parseScientific,
} from "@orderbook/core/index";
import { useTheaProvider } from "@orderbook/core/providers";

import { useBridge, usePool } from "@/hooks";
import {
  ErrorMessage,
  GenericHorizontalItem,
  Terms,
} from "@/components/ui/ReadyToUse";
import { formatAmount } from "@/helpers";

interface Props {
  openFeeModal: boolean;
  setOpenFeeModal: Dispatch<SetStateAction<boolean>>;
  amount: number;
  onSuccess: () => void;
}

export const ConfirmTransaction = ({
  openFeeModal,
  setOpenFeeModal,
  amount,
  onSuccess,
}: Props) => {
  const [checked, setChecked] = useState(false);
  const {
    sourceAccount,
    destinationAccount,
    transferConfig,
    transferConfigLoading,
    destinationPDEXBalance,
    selectedAsset,
    isDestinationPolkadex,
    selectedAssetIdPolkadex,
  } = useTheaProvider();
  const { destinationFee, sourceFee, sourceFeeBalance, sourceFeeExistential } =
    transferConfig ?? {};

  const showAutoSwap = useMemo(
    () => isDestinationPolkadex && !destinationPDEXBalance,
    [isDestinationPolkadex, destinationPDEXBalance]
  );

  const { swapPrice = 0, swapLoading } = usePool({
    asset: selectedAssetIdPolkadex,
    amount: THEA_AUTOSWAP,
    enabled: showAutoSwap,
  });

  const shortSourceAddress = useMemo(
    () => truncateString(sourceAccount?.address ?? "", 4),
    [sourceAccount?.address]
  );

  const shortDestinationAddress = useMemo(
    () => truncateString(destinationAccount?.address ?? "", 4),
    [destinationAccount?.address]
  );
  const { mutateAsync, isLoading } = useBridge({ onSuccess });

  const error = useMemo(() => {
    const autoSwapAmount = showAutoSwap ? swapPrice : 0;
    const balance = sourceFeeBalance?.amount ?? 0;
    const existential = sourceFeeExistential?.amount ?? 0;
    const fee = sourceFee?.amount ?? 0;

    if (balance <= fee + existential) return CrossChainError.SOURCE_FEE;
    if (showAutoSwap && !swapPrice) return CrossChainError.NOT_ENOUGH_LIQUIDITY;

    if (showAutoSwap && amount <= autoSwapAmount)
      return CrossChainError.AUTO_SWAP(
        autoSwapAmount.toFixed(4),
        selectedAsset?.ticker as string
      );
  }, [
    amount,
    selectedAsset?.ticker,
    showAutoSwap,
    sourceFee?.amount,
    sourceFeeBalance?.amount,
    sourceFeeExistential?.amount,
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
                          {sourceAccount?.name} • {shortSourceAddress}
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
                {showAutoSwap && (
                  <GenericHorizontalItem
                    label="Swap required"
                    tooltip={`In order to bridge your funds and sign transactions on Polkadex, you must have at least 1.5 PDEX in your destination wallet. Your current destination wallet balance is ${destinationPDEXBalance} PDEX.
                  A small part of your transfer will be auto-swapped to PDEX to meet this requirement.`}
                    defaultOpen
                  >
                    <div className="flex items-center gap-1">
                      <RiGasStationLine className="w-3.5 h-3.5 text-secondary" />
                      <Skeleton loading={swapLoading} className="min-h-4 w-10">
                        <div className="flex items-center gap-1">
                          <Typography.Text>
                            {swapPrice > 0
                              ? `${swapPrice.toFixed(4)} ${selectedAsset?.ticker}`
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
                              1.5 PDEX
                            </Typography.Text>
                          </Skeleton>
                        </div>
                      </Skeleton>
                    </div>
                  </GenericHorizontalItem>
                )}
                <HoverInformation>
                  <HoverInformation.Trigger>
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
                        {swapPrice.toFixed(4)} {selectedAsset?.ticker}
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
