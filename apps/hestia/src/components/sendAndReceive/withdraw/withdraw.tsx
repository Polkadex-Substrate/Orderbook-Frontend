"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  HoverInformation,
  ResponsiveCard,
  Typography,
  Button,
  Input,
  Tooltip,
  Modal,
} from "@polkadex/ux";
import { Chain, ChainType } from "@polkadex/thea";
import {
  RiCheckLine,
  RiInformationFill,
  RiLoader2Line,
} from "@remixicon/react";
import classNames from "classnames";
import { useMeasure } from "react-use";
import { useFormik } from "formik";
import { useDirectWithdrawProvider } from "@orderbook/core/providers/user/sendAndReceive";
import {
  directWithdrawValidations,
  withdrawValidations,
} from "@orderbook/core/validations";
import { THEA_WITHDRAW_FEE } from "@orderbook/core/constants";
import { useConnectWalletProvider } from "@orderbook/core/providers/user/connectWalletProvider";
import { tryUnlockTradeAccount } from "@orderbook/core/helpers";
import { useWindowSize } from "usehooks-ts";

import { SelectNetwork } from "../selectNetwork";
import { SelectAsset } from "../selectAsset";
import { SelectWallet } from "../selectWallet";

import { ConfirmTransaction } from "./confirmTransaction";

import { formatAmount } from "@/helpers";
import { usePool } from "@/hooks";
import { UnlockAccount } from "@/components/ui/ReadyToUse/unlockAccount";

const initialValues = {
  amount: "",
};

export const Withdraw = () => {
  const { width } = useWindowSize();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [confirmTxModal, setConfirmTxModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [ref, bounds] = useMeasure<HTMLDivElement>();
  const responsive = useMemo(() => width > 500, [width]);

  const { selectedTradingAccount } = useConnectWalletProvider();
  const {
    chains,
    sourceChain,
    destinationChain,
    onSelectDestinationChain,
    sourceAccount,
    destinationAccount,
    setDestinationAccount,
    supportedAssets,
    selectedAsset,
    onSelectAsset,
    sourceBalances,
    sourceBalancesLoading,
    selectedAssetBalance,
    isDestinationPolkadex,
    transferConfig,
    transferConfigLoading,
  } = useDirectWithdrawProvider();
  const { destinationFee, sourceFee } = transferConfig ?? {};

  const showAutoSwap = useMemo(
    () => !isDestinationPolkadex && !!selectedAsset?.id,
    [isDestinationPolkadex, selectedAsset?.id]
  );

  const { swapPrice = 0, swapLoading } = usePool({
    asset: selectedAsset?.id,
    amount: THEA_WITHDRAW_FEE,
    enabled: showAutoSwap,
  });

  const autoSwapAmount = useMemo(
    () => formatAmount(+swapPrice.toFixed(6)),
    [swapPrice]
  );

  const balanceAmount = useMemo(
    () => formatAmount(selectedAssetBalance),
    [selectedAssetBalance]
  );

  const [
    destinationFeeAmount,
    destinationFeeTicker,
    sourceFeeAmount,
    sourceFeeTicker,
  ] = useMemo(() => {
    const destValue = destinationFee?.amount;
    const sourceValue = sourceFee?.amount;

    return [
      destValue ? `~ ${formatAmount(destValue)}` : "Ø",
      destValue ? destinationFee?.ticker : "",
      sourceValue ? `~ ${formatAmount(sourceValue)}` : "Ø",
      sourceValue ? sourceFee?.ticker : "",
    ];
  }, [
    destinationFee?.amount,
    destinationFee?.ticker,
    sourceFee?.amount,
    sourceFee?.ticker,
  ]);

  const minAmount = useMemo(() => {
    if (isDestinationPolkadex) return 0;
    const destFee =
      destinationFee?.ticker === selectedAsset?.ticker
        ? destinationFee?.amount || 0
        : 0;
    if (selectedAsset?.ticker === "PDEX") return THEA_WITHDRAW_FEE + destFee;
    return +autoSwapAmount + destFee;
  }, [
    isDestinationPolkadex,
    selectedAsset?.ticker,
    destinationFee?.ticker,
    destinationFee?.amount,
    autoSwapAmount,
  ]);

  const {
    handleSubmit,
    errors,
    getFieldProps,
    isValid,
    dirty,
    values,
    setFieldValue,
    resetForm,
  } = useFormik({
    initialValues,
    validationSchema: isDestinationPolkadex
      ? withdrawValidations(selectedAssetBalance)
      : directWithdrawValidations(
          !!sourceAccount,
          !!destinationAccount,
          isDestinationPolkadex,
          selectedAsset?.ticker || "",
          +minAmount,
          +balanceAmount,
          +autoSwapAmount
        ),
    onSubmit: () => {
      if (selectedTradingAccount?.account?.isLocked) setShowPassword(true);
      else setConfirmTxModal(true);
    },
  });

  const loading = useMemo(() => {
    if (!sourceAccount || !destinationAccount) return false;
    if (isDestinationPolkadex) return sourceBalancesLoading;
    const isLoading = transferConfigLoading || sourceBalancesLoading;
    if (!selectedAsset?.id) return isLoading;
    return isLoading || swapLoading;
  }, [
    destinationAccount,
    isDestinationPolkadex,
    sourceAccount,
    swapLoading,
    sourceBalancesLoading,
    transferConfigLoading,
    selectedAsset?.id,
  ]);

  const disabled = useMemo(
    () =>
      !selectedAsset ||
      !sourceAccount ||
      !sourceChain ||
      !destinationAccount ||
      !destinationChain ||
      !(isValid && dirty),
    [
      selectedAsset,
      sourceAccount,
      sourceChain,
      destinationAccount,
      destinationChain,
      dirty,
      isValid,
    ]
  );

  const onChangeMax = () => setFieldValue("amount", balanceAmount);

  useEffect(() => {
    if (selectedTradingAccount?.account)
      tryUnlockTradeAccount(selectedTradingAccount.account);
  }, [selectedTradingAccount?.account]);

  return (
    <Fragment>
      <ConfirmTransaction
        openFeeModal={confirmTxModal}
        setOpenFeeModal={setConfirmTxModal}
        amount={values.amount}
        onSuccess={() => {
          resetForm();
          setConfirmTxModal(false);
        }}
        showAutoSwap={showAutoSwap}
        swapLoading={swapLoading}
        swapPrice={+autoSwapAmount}
        minAmount={minAmount}
      />
      <Modal open={showPassword} onOpenChange={setShowPassword}>
        <Modal.Content>
          <UnlockAccount
            onClose={() => setShowPassword(false)}
            onAction={() => {
              formRef?.current?.dispatchEvent(
                new Event("submit", { cancelable: true, bubbles: true })
              );
            }}
            tempBrowserAccount={selectedTradingAccount?.account}
          />
        </Modal.Content>
      </Modal>
      <form ref={formRef} onSubmit={handleSubmit}>
        <div
          className={classNames(
            "flex flex-col md:max-w-[500px] py-8 max-md:pl-6",
            !responsive && "px-2"
          )}
        >
          <div className="flex flex-col">
            <div
              className={classNames(
                "flex flex-col gap-2 pb-5",
                responsive && "relative border-l-2 border-primary-base px-8 "
              )}
            >
              <Typography.Heading size="lg" className="leading-none">
                To Network
              </Typography.Heading>
              <SelectNetwork
                allChains={chains}
                selectedChain={destinationChain as Chain}
                onSelectChain={(e) => {
                  onSelectDestinationChain(e);
                  resetForm();
                }}
              />
              <div className="flex item-center justify-center bg-primary-base rounded-full w-4 h-4 p-0.5 absolute top-0 -left-2.5">
                <RiCheckLine className="w-full h-full" />
              </div>
            </div>

            <div
              className={classNames(
                "flex flex-col gap-2 pb-5",
                responsive && "border-l-2 border-primary-base px-8 relative"
              )}
            >
              <Typography.Text size="lg" bold>
                To Account
              </Typography.Text>
              <div
                className={classNames(
                  "border border-primary rounded-sm px-2 py-4",
                  isDestinationPolkadex && "pointer-events-none opacity-60"
                )}
              >
                <SelectWallet
                  account={destinationAccount}
                  setAccount={(e) => {
                    setDestinationAccount(e);
                    resetForm();
                  }}
                  evm={destinationChain?.type !== ChainType.Substrate}
                />
              </div>
              <div
                className={classNames(
                  "flex item-center justify-center bg-primary rounded-full w-4 h-4 p-0.5 absolute top-0 -left-2.5",
                  destinationAccount && "bg-primary-base"
                )}
              >
                {destinationAccount && (
                  <RiCheckLine className="w-full h-full" />
                )}
              </div>
            </div>

            <div
              className={classNames(
                "flex flex-col gap-2 pb-5",
                responsive && "px-8 relative"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <Typography.Heading size="lg" className="leading-none">
                  Asset
                </Typography.Heading>
                <HoverInformation>
                  <HoverInformation.Trigger
                    loading={sourceBalancesLoading}
                    className="min-w-20"
                  >
                    <RiInformationFill className="w-3 h-3 text-actionInput" />
                    <Typography.Text size="xs" appearance="primary">
                      Available: {balanceAmount} {selectedAsset?.ticker}
                    </Typography.Text>
                  </HoverInformation.Trigger>
                  <HoverInformation.Content
                    className={classNames(loading && "hidden")}
                  >
                    <ResponsiveCard label="Source fee" loading={loading}>
                      {sourceFeeAmount} {sourceFeeTicker}
                    </ResponsiveCard>
                    <ResponsiveCard label="Destination fee" loading={loading}>
                      {destinationFeeAmount} {destinationFeeTicker}
                    </ResponsiveCard>
                    <ResponsiveCard label="Available" loading={loading}>
                      {balanceAmount} {selectedAsset?.ticker}
                    </ResponsiveCard>
                  </HoverInformation.Content>
                </HoverInformation>
              </div>
              <div className="flex flex-col gap-2">
                <div
                  ref={ref}
                  className="flex item-center border border-primary rounded-sm"
                >
                  <SelectAsset
                    width={bounds.width}
                    sourceChain={sourceChain}
                    supportedAssets={supportedAssets}
                    selectedAsset={selectedAsset}
                    onSelectAsset={(e) => {
                      onSelectAsset(e);
                      resetForm();
                    }}
                    sourceBalances={sourceBalances}
                    sourceBalancesLoading={sourceBalancesLoading}
                  />
                  <Tooltip open={!!errors.amount}>
                    <Tooltip.Trigger asChild>
                      <div
                        className={classNames(
                          "w-full pr-4",
                          errors.amount && "border-danger-base border"
                        )}
                      >
                        <Input.Vertical
                          type="text"
                          autoComplete="off"
                          placeholder="Enter an amount"
                          {...getFieldProps("amount")}
                          className="max-sm:focus:text-[16px] w-full pl-4 py-4"
                        >
                          {sourceAccount && +balanceAmount && !loading && (
                            <Input.Action
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                onChangeMax();
                              }}
                            >
                              MAX
                            </Input.Action>
                          )}
                        </Input.Vertical>
                      </div>
                    </Tooltip.Trigger>
                    <Tooltip.Content className="bg-level-5 z-[2] p-1">
                      {errors.amount}
                    </Tooltip.Content>
                  </Tooltip>
                </div>
              </div>
              <div className="flex item-center justify-center bg-primary-base rounded-full w-4 h-4 p-0.5 absolute top-0 -left-[7px]">
                <RiCheckLine className="w-full h-full" />
              </div>
            </div>
            <div className={classNames("w-full", responsive && "px-8")}>
              {loading ? (
                <Button.Solid
                  className="w-full py-5 flex items-center gap-1 opacity-60"
                  size="md"
                  disabled
                >
                  <RiLoader2Line className="w-5 h-5 animate-spin" />
                  Connecting...
                </Button.Solid>
              ) : (
                <Button.Solid
                  className="w-full py-5"
                  size="md"
                  disabled={disabled}
                  appearance="primary"
                >
                  Withdraw
                </Button.Solid>
              )}
            </div>
          </div>
        </div>
      </form>
    </Fragment>
  );
};
