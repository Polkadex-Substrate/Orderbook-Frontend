"use client";

import { Fragment, useMemo, useState } from "react";
import { useFormik } from "formik";
import {
  HoverInformation,
  ResponsiveCard,
  Typography,
  Button,
  Input,
  Tooltip,
} from "@polkadex/ux";
import {
  RiCheckLine,
  RiInformationFill,
  RiLoader2Line,
} from "@remixicon/react";
import classNames from "classnames";
import { useMeasure } from "react-use";
import { useDirectDepositProvider } from "@orderbook/core/providers/user/sendAndReceive";
import { Chain, ChainType } from "@polkadex/thea";
import {
  depositValidations,
  directDepositValidations,
} from "@orderbook/core/validations";
import {
  ESTIMATED_FEE,
  OTHER_ASSET_EXISTENTIAL,
} from "@orderbook/core/constants";
import { parseScientific, trimFloat } from "@polkadex/numericals";
import { useWindowSize } from "usehooks-ts";

import { SelectNetwork } from "../selectNetwork";
import { SelectAsset } from "../selectAsset";
import { SelectWallet } from "../selectWallet";

import { ConfirmTransaction } from "./confirmTransaction";

import { formatAmount } from "@/helpers";
import { useQueryPools } from "@/hooks";

const initialValues = {
  amount: "",
};

export const Deposit = () => {
  const { width } = useWindowSize();
  const [confirmTxModal, setConfirmTxModal] = useState(false);
  const [ref, bounds] = useMeasure<HTMLDivElement>();
  const responsive = useMemo(() => width > 500, [width]);

  const { pools, poolsLoading } = useQueryPools();
  const {
    chains,
    sourceChain,
    onSelectSourceChain,
    destinationChain,
    destinationAccount,
    sourceBalancesLoading,
    sourceBalances,
    selectedAssetBalance,
    supportedAssets,
    selectedAsset,
    onSelectAsset,
    transferConfigLoading,
    transferConfig,
    sourceAccount,
    setSourceAccount,
    isDestinationBalanceLoading,
    selectedAssetIdDestination,
    destinationPDEXBalance,
    isSourcePolkadex,
  } = useDirectDepositProvider();
  const { destinationFee, sourceFee, max, min } = transferConfig ?? {};

  const poolReserve = useMemo(() => {
    return pools?.find((p) => p.id === selectedAssetIdDestination);
  }, [pools, selectedAssetIdDestination]);

  const balanceAmount = useMemo(
    () => formatAmount(selectedAssetBalance),
    [selectedAssetBalance]
  );

  /* Special case => When source chain is Polkadex */
  const isPolkadexToken = useMemo(
    () => selectedAsset?.ticker === "PDEX",
    [selectedAsset?.ticker]
  );

  const existentialBalance = useMemo(
    () => (isPolkadexToken ? 1 : OTHER_ASSET_EXISTENTIAL),
    [isPolkadexToken]
  );
  /*******/

  const minAmount = useMemo(() => {
    if (isSourcePolkadex) return 0;
    const configMin = min?.amount || 0;
    const destFee =
      destinationFee?.ticker === selectedAsset?.ticker
        ? destinationFee?.amount || 0
        : 0;
    return Math.max(configMin, destFee);
  }, [
    isSourcePolkadex,
    destinationFee?.amount,
    destinationFee?.ticker,
    min?.amount,
    selectedAsset?.ticker,
  ]);

  const maxAmount = useMemo(() => {
    if (isSourcePolkadex) {
      if (selectedAssetBalance > existentialBalance) {
        let balance = selectedAssetBalance - existentialBalance;
        if (isPolkadexToken) balance = Math.max(balance - ESTIMATED_FEE, 0);
        const trimmedBalance = +trimFloat({ value: balance });
        const formattedBalance = parseScientific(trimmedBalance.toString());
        return formattedBalance;
      }
      return "0";
    }
    return formatAmount(max?.amount ?? 0);
  }, [
    existentialBalance,
    isPolkadexToken,
    isSourcePolkadex,
    max?.amount,
    selectedAssetBalance,
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
    validationSchema: isSourcePolkadex
      ? depositValidations(
          selectedAssetBalance,
          isPolkadexToken,
          existentialBalance
        )
      : directDepositValidations(
          !!sourceAccount,
          !!destinationAccount,
          minAmount,
          +maxAmount,
          destinationPDEXBalance,
          selectedAssetBalance,
          poolReserve?.reserve || 0
        ),
    onSubmit: () => setConfirmTxModal(true),
  });

  const onChangeMax = () => setFieldValue("amount", maxAmount);

  const loading = useMemo(() => {
    if (!sourceAccount || !destinationAccount) return false;
    if (isSourcePolkadex) return sourceBalancesLoading;
    const isLoading = transferConfigLoading || sourceBalancesLoading;
    return isLoading || poolsLoading || isDestinationBalanceLoading;
  }, [
    isSourcePolkadex,
    isDestinationBalanceLoading,
    poolsLoading,
    sourceAccount,
    destinationAccount,
    sourceBalancesLoading,
    transferConfigLoading,
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

  return (
    <Fragment>
      <ConfirmTransaction
        openFeeModal={confirmTxModal}
        setOpenFeeModal={setConfirmTxModal}
        amount={Number(values.amount)}
        onSuccess={() => {
          resetForm();
          setConfirmTxModal(false);
        }}
      />
      <form onSubmit={handleSubmit}>
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
                responsive && "relative border-l-2 border-success-base px-8 "
              )}
            >
              <Typography.Text size="lg" bold>
                From Account
              </Typography.Text>
              <div className="border border-primary rounded-sm px-2 py-4">
                <SelectWallet
                  account={sourceAccount}
                  setAccount={(e) => {
                    setSourceAccount(e);
                    resetForm();
                  }}
                  evm={sourceChain?.type !== ChainType.Substrate}
                />
              </div>
              <div
                className={classNames(
                  "flex item-center justify-center bg-primary rounded-full w-4 h-4 p-0.5 absolute top-0 -left-2.5",
                  sourceAccount && "bg-success-base"
                )}
              >
                {sourceAccount && <RiCheckLine className="w-full h-full" />}
              </div>
            </div>
            <div
              className={classNames(
                "flex flex-col gap-2 pb-5",
                responsive && "relative border-l-2 border-success-base px-8 "
              )}
            >
              <Typography.Heading size="lg" className="leading-none">
                From Network
              </Typography.Heading>
              <SelectNetwork
                allChains={chains}
                selectedChain={sourceChain as Chain}
                onSelectChain={(e) => {
                  onSelectSourceChain(e);
                  resetForm();
                }}
              />
              <div className="flex item-center justify-center bg-success-base rounded-full w-4 h-4 p-0.5 absolute top-0 -left-2.5">
                <RiCheckLine className="w-full h-full" />
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
                    loading={loading}
                    className="min-w-20"
                  >
                    <RiInformationFill className="w-3 h-3 text-actionInput" />
                    <Typography.Text size="xs" appearance="primary">
                      Available: {balanceAmount} {selectedAsset?.ticker}
                    </Typography.Text>
                  </HoverInformation.Trigger>
                  <HoverInformation.Content
                    className={classNames(sourceBalancesLoading && "hidden")}
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
                          {sourceAccount && +maxAmount && !loading && (
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
              {responsive && (
                <div className="flex item-center justify-center bg-success-base rounded-full w-4 h-4 p-0.5 absolute top-0 -left-[7px]">
                  <RiCheckLine className="w-full h-full" />
                </div>
              )}
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
                  appearance="success"
                >
                  Deposit
                </Button.Solid>
              )}
            </div>
          </div>
        </div>
      </form>
    </Fragment>
  );
};
