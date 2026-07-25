"use client";

import {
  Button,
  Input,
  Token,
  TokenAppearance,
  Typography,
  AccountCombobox,
} from "@mitra/ux";
import {
  RiArrowDownSLine,
  RiArrowLeftRightLine,
  RiLoader2Line,
  RiWalletLine,
} from "@remixicon/react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useFormik } from "formik";
import classNames from "classnames";
import { bridgeValidations } from "@orderbook/core/validations";
import { useWeb3Modal } from "@web3modal/wagmi/react";

import { useBridgeProvider } from "../BridgeProvider";
import { SelectAsset } from "../selectAsset";
import { ConnectAccount } from "../connectAccount";
import { ConfirmTransaction } from "../confirmTransaction";

import { WalletCard } from "./walletCard";
import { SelectNetwork } from "./selectNetwork";

import { createQueryString, formatAmount } from "@/helpers";
import { useQueryPools } from "@/hooks";

const initialValues = {
  amount: "",
};

export const Form = () => {
  const { open } = useWeb3Modal();

  const [openAsset, setOpenAsset] = useState(false);
  const [openFeeModal, setOpenFeeModal] = useState(false);
  const [openSourceModal, setOpenSourceModal] = useState(false);

  const {
    sourceChain,
    onSelectSourceChain,
    destinationChain,
    onSelectDestinationChain,
    sourceAccount,
    setSourceAccount,
    destinationAccount,
    setDestinationAccount,
    selectedAsset,
    transferConfigLoading,
    sourceBalancesLoading,
    transferConfig,
    selectedAssetBalance,
    supportedSourceChains,
    supportedDestinationChains,
    onSwitchChain: onSwitch,
    selectedAssetIdPolkadex,
    isDestinationPolkadex,
    destinationPDEXBalance,
    isDestinationPDEXBalanceLoading,
    setTransferAmount,
    isEvmSource,
    refetchSourceBalance,
  } = useBridgeProvider();

  const { destinationFee, sourceFee, max, min } = transferConfig ?? {};
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { push } = useRouter();
  const { pools, poolsLoading } = useQueryPools();

  const poolReserve = useMemo(() => {
    return pools?.find((p) => p.id === selectedAssetIdPolkadex);
  }, [pools, selectedAssetIdPolkadex]);

  const onSwitchChain = () => {
    onSwitch();
    resetForm();
  };

  const loading = useMemo(() => {
    if (!sourceAccount || !destinationAccount) return false;
    const isLoading = transferConfigLoading || sourceBalancesLoading;
    if (!isDestinationPolkadex) return isLoading;
    return isLoading || poolsLoading || isDestinationPDEXBalanceLoading;
  }, [
    sourceAccount,
    destinationAccount,
    poolsLoading,
    sourceBalancesLoading,
    transferConfigLoading,
    isDestinationPDEXBalanceLoading,
    isDestinationPolkadex,
  ]);

  const minAmount = useMemo(() => {
    const configMin = min?.amount || 0;
    const destFee =
      destinationFee?.ticker === selectedAsset?.ticker
        ? destinationFee?.amount || 0
        : 0;
    return Math.max(configMin, destFee);
  }, [
    destinationFee?.amount,
    destinationFee?.ticker,
    min?.amount,
    selectedAsset?.ticker,
  ]);

  const {
    handleSubmit,
    errors,
    touched,
    getFieldProps,
    isValid,
    dirty,
    values,
    setFieldValue,
    resetForm,
  } = useFormik({
    initialValues,
    validationSchema: bridgeValidations(
      minAmount,
      sourceBalancesLoading ? undefined : max?.amount,
      destinationPDEXBalance,
      selectedAssetBalance,
      isDestinationPolkadex,
      poolReserve?.reserve || 0
    ),
    onSubmit: () => setOpenFeeModal(true),
  });

  useEffect(() => {
    const parsed = parseFloat(values.amount);
    setTransferAmount(isNaN(parsed) ? 0 : parsed);
  }, [values.amount, setTransferAmount]);

  const parsedAmount = useMemo(() => {
    const v = parseFloat(values.amount);
    return isNaN(v) ? 0 : v;
  }, [values.amount]);

  const displayTicker =
    selectedAsset?.ticker === "WETH" ? "ETH" : selectedAsset?.ticker;

  /** The primary button always states the next required step instead of
   *  sitting there disabled and gray with no explanation. Where the step is
   *  actionable (connect wallet, pick token), clicking performs it. */
  const primaryAction = useMemo(():
    | { label: string; onClick?: () => void; submit?: boolean }
    | { label: string; blocked: true } => {
    if (!sourceChain || !destinationChain)
      return { label: "Select networks", blocked: true };
    if (!sourceAccount)
      return isEvmSource
        ? { label: `Connect ${sourceChain.name} wallet`, onClick: () => open() }
        : {
            label: `Connect ${sourceChain.name} account`,
            onClick: () => setOpenSourceModal(true),
          };
    if (!selectedAsset)
      return { label: "Select a token", onClick: () => setOpenAsset(true) };
    if (!destinationAccount)
      return isEvmSource
        ? { label: "Choose a destination account above", blocked: true }
        : {
            label: `Connect ${destinationChain.name} wallet`,
            onClick: () => open(),
          };
    if (!dirty || !parsedAmount)
      return { label: "Enter an amount", blocked: true };
    if (errors.amount || !isValid) {
      const msg = errors.amount ?? "";
      return {
        label: /exceed|insufficient/i.test(msg)
          ? `Insufficient ${displayTicker} balance`
          : msg || "Check the amount",
        blocked: true,
      };
    }
    return { label: "Transfer", submit: true };
  }, [
    sourceChain,
    destinationChain,
    sourceAccount,
    destinationAccount,
    selectedAsset,
    isEvmSource,
    dirty,
    parsedAmount,
    errors.amount,
    isValid,
    displayTicker,
    open,
  ]);

  const onChangeMax = () => {
    const formattedAmount = formatAmount(max?.amount ?? 0);
    setFieldValue("amount", formattedAmount);
  };

  const balanceAmount = useMemo(
    () => formatAmount(selectedAssetBalance),
    [selectedAssetBalance]
  );

  /** Errors only render once a wallet is connected (an empty balance is not
   *  the user's mistake) and the field has been visited. */
  const showAmountError = !!(sourceAccount && errors.amount && touched.amount);

  const estimatedReceive = useMemo(() => {
    const destFee =
      destinationFee?.ticker === selectedAsset?.ticker
        ? (destinationFee?.amount ?? 0)
        : 0;
    return Math.max(parsedAmount - destFee, 0);
  }, [
    parsedAmount,
    destinationFee?.amount,
    destinationFee?.ticker,
    selectedAsset?.ticker,
  ]);

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

  useEffect(() => {
    const data = [
      { name: "from", value: sourceChain?.name },
      { name: "to", value: destinationChain?.name },
      { name: "asset", value: selectedAsset?.ticker },
    ];
    createQueryString({ data, pathname, searchParams, push });
  }, [
    destinationChain?.name,
    pathname,
    push,
    searchParams,
    selectedAsset?.ticker,
    sourceChain?.name,
  ]);

  // ── Reusable EVM wallet connect row ───────────────────────────────────────
  const EvmWalletRow = ({
    account,
  }: {
    account?: { name?: string; address: string } | null;
  }) => {
    if (account) {
      return (
        <WalletCard
          name={account.name}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            open();
          }}
        >
          {account.address}
        </WalletCard>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <RiWalletLine className="w-3.5 h-3.5 text-actionInput" />
          <Typography.Text>No wallet connected</Typography.Text>
        </div>
        <Button.Solid
          appearance="secondary"
          size="xs"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            open();
          }}
        >
          Connect wallet
        </Button.Solid>
      </div>
    );
  };

  return (
    <Fragment>
      <ConfirmTransaction
        openFeeModal={openFeeModal}
        setOpenFeeModal={setOpenFeeModal}
        amount={Number(values.amount)}
        onSuccess={() => {
          resetForm();
          setOpenFeeModal(false);
          refetchSourceBalance();
        }}
      />
      <SelectAsset open={openAsset} onOpenChange={setOpenAsset} />
      <ConnectAccount
        open={openSourceModal}
        onOpenChange={setOpenSourceModal}
        setAccount={setSourceAccount}
        evm={sourceChain?.type !== "Substrate"}
      />

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-5 max-w-[640px] mx-auto py-8 w-full px-4"
      >
        <div className="flex flex-col gap-6 border border-primary rounded-md bg-level-0 p-6 max-sm:p-4">
          <div className="flex flex-col gap-3">
            <Typography.Heading>Networks</Typography.Heading>
            <div className="flex flex-col gap-2">
              {/* ── FROM ───────────────────────────────────────────────── */}
              <div className="flex flex-col gap-2 flex-1">
                <div className="flex flex-col gap-2">
                  <Typography.Text appearance="primary">From</Typography.Text>
                  <SelectNetwork
                    name={sourceChain?.name}
                    icon={sourceChain?.logo}
                  >
                    {supportedSourceChains.map((e) => (
                      <SelectNetwork.Card
                        key={e.id}
                        icon={e.logo}
                        value={e.name}
                        onSelect={() => onSelectSourceChain(e)}
                      />
                    ))}
                  </SelectNetwork>
                </div>
                {/* EVM source → WalletConnect | Substrate source → extension picker */}
                {isEvmSource ? (
                  <EvmWalletRow account={sourceAccount} />
                ) : (
                  <AccountCombobox
                    account={sourceAccount}
                    setAccount={(e) => e && setSourceAccount(e)}
                    evm={false}
                  />
                )}
              </div>

              {/* ── SWAP DIRECTION ─────────────────────────────────────── */}
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 border-t border-primary" />
                <Button.Icon
                  type="button"
                  variant="outline"
                  className="h-10 w-10 p-2.5 rotate-90 rounded-full border border-primary bg-level-1 hover:bg-level-2 transition-colors"
                  onClick={onSwitchChain}
                  aria-label="Swap transfer direction"
                >
                  <RiArrowLeftRightLine className="w-full h-full" />
                </Button.Icon>
                <div className="flex-1 border-t border-primary" />
              </div>

              {/* ── TO ─────────────────────────────────────────────────── */}
              <div className="flex flex-col gap-2 flex-1">
                <div className="flex flex-col gap-2">
                  <Typography.Text appearance="primary">To</Typography.Text>
                  <SelectNetwork
                    name={destinationChain?.name}
                    icon={destinationChain?.logo}
                  >
                    {supportedDestinationChains.map((e) => (
                      <SelectNetwork.Card
                        key={e.id}
                        icon={e.logo}
                        value={e.name}
                        onSelect={() => onSelectDestinationChain(e)}
                      />
                    ))}
                  </SelectNetwork>
                </div>
                {/* EVM destination → extension picker | Substrate destination → WalletConnect */}
                {isEvmSource ? (
                  <AccountCombobox
                    account={destinationAccount}
                    setAccount={(e) => e && setDestinationAccount(e)}
                    evm={false}
                  />
                ) : (
                  <EvmWalletRow account={destinationAccount} />
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Typography.Heading>Asset</Typography.Heading>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <Typography.Text appearance="primary">Amount</Typography.Text>
                {sourceAccount && selectedAsset && (
                  <button
                    type="button"
                    className="text-xs opacity-80 hover:opacity-100 hover:underline disabled:no-underline"
                    onClick={onChangeMax}
                    disabled={!max?.amount || loading}
                    title="Use maximum transferable amount"
                  >
                    Available: {balanceAmount} {displayTicker}
                  </button>
                )}
              </div>
              <div
                className={classNames(
                  "flex item-center border rounded-sm",
                  showAmountError ? "border-danger-base" : "border-primary"
                )}
              >
                <div className="w-full pr-4">
                  <Input.Vertical
                    type="text"
                    autoComplete="off"
                    placeholder="Enter an amount"
                    {...getFieldProps("amount")}
                    className="max-sm:focus:text-[16px] w-full pl-4 py-4"
                  >
                    {sourceAccount && max?.amount && !loading && (
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
                <Button.Outline
                  type="button"
                  appearance="secondary"
                  className="gap-1 px-2 justify-between h-full"
                  onClick={() => setOpenAsset(true)}
                  disabled={!sourceChain || !destinationChain}
                >
                  <div className="flex items-center gap-2">
                    {selectedAsset ? (
                      <Token
                        name={
                          selectedAsset.ticker === "WETH"
                            ? "ETH"
                            : selectedAsset.ticker
                        }
                        size="md"
                        appearance={selectedAsset.logo as TokenAppearance}
                        className="rounded-full border border-primary"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-level-5" />
                    )}
                    <Typography.Text size="md">
                      {selectedAsset
                        ? selectedAsset.ticker === "WETH"
                          ? "ETH"
                          : selectedAsset.ticker
                        : "Select token"}
                    </Typography.Text>
                  </div>
                  <RiArrowDownSLine className="w-4 h-4" />
                </Button.Outline>
              </div>
              {showAmountError && (
                <Typography.Text size="xs" className="text-danger-base">
                  {errors.amount}
                </Typography.Text>
              )}
            </div>
          </div>

          {/* ── SUMMARY — what actually happens if you press Transfer ──── */}
          {sourceAccount &&
            destinationAccount &&
            selectedAsset &&
            parsedAmount > 0 &&
            !errors.amount && (
              <div className="flex flex-col gap-2 border border-primary rounded-sm bg-level-1 p-4">
                <div className="flex items-center justify-between">
                  <Typography.Text size="xs" appearance="primary">
                    You&apos;ll receive (est.)
                  </Typography.Text>
                  <Typography.Text size="xs" bold>
                    {formatAmount(estimatedReceive)} {displayTicker}
                  </Typography.Text>
                </div>
                <div className="flex items-center justify-between">
                  <Typography.Text size="xs" appearance="primary">
                    Source fee
                  </Typography.Text>
                  <Typography.Text size="xs">
                    {sourceFeeAmount} {sourceFeeTicker}
                  </Typography.Text>
                </div>
                <div className="flex items-center justify-between">
                  <Typography.Text size="xs" appearance="primary">
                    Destination fee
                  </Typography.Text>
                  <Typography.Text size="xs">
                    {destinationFeeAmount} {destinationFeeTicker}
                  </Typography.Text>
                </div>
                <div className="flex items-center justify-between">
                  <Typography.Text size="xs" appearance="primary">
                    Estimated arrival
                  </Typography.Text>
                  <Typography.Text size="xs">
                    ~10–30 min (Hyperbridge relay)
                  </Typography.Text>
                </div>
              </div>
            )}
        </div>

        {loading ? (
          <Button.Solid
            className="w-full py-5 flex items-center gap-1 opacity-60"
            size="md"
            disabled
          >
            <RiLoader2Line className="w-5 h-5 animate-spin" />
            Loading balances...
          </Button.Solid>
        ) : "submit" in primaryAction && primaryAction.submit ? (
          <Button.Solid type="submit" className="w-full py-5" size="md">
            {primaryAction.label}
          </Button.Solid>
        ) : "onClick" in primaryAction && primaryAction.onClick ? (
          <Button.Solid
            type="button"
            className="w-full py-5"
            size="md"
            onClick={primaryAction.onClick}
          >
            {primaryAction.label}
          </Button.Solid>
        ) : (
          <Button.Solid
            type="button"
            className="w-full py-5"
            size="md"
            disabled
          >
            {primaryAction.label}
          </Button.Solid>
        )}
      </form>
    </Fragment>
  );
};
