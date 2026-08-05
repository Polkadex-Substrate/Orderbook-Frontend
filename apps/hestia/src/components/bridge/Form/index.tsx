"use client";

import {
  Button,
  Input,
  Token,
  TokenAppearance,
  Typography,
} from "@mitrabook/ux";
import {
  RiArrowDownSLine,
  RiArrowLeftRightLine,
  RiLoader2Line,
} from "@remixicon/react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useFormik } from "formik";
import classNames from "classnames";
import { bridgeValidations } from "@orderbook/core/validations";
import { useWeb3Modal } from "@web3modal/wagmi/react";
import { useExtensionAccounts } from "@aksumite/react-providers";

import { useBridgeProvider } from "../BridgeProvider";
import { SelectAsset } from "../selectAsset";
import { ConnectAccount } from "../connectAccount";
import { ConfirmTransaction } from "../confirmTransaction";
import { MoveFromTradingModal } from "../moveFromTradingModal";
import {
  computeCoverableShortfall,
  totalFundingNeeded,
  hasGasForBridge,
} from "../moveFromTrading.logic";
import {
  BRIDGE_MAINNET_FEES_ENABLED,
  BRIDGE_RELAYER_FEE,
  BRIDGE_MIN_PDEX_FOR_GAS,
} from "@/config/bridgeFees";

import { WalletCard } from "./walletCard";
import { PendingAccountRow } from "./pendingAccountRow";
import { ConnectionSteps } from "./connectionSteps";
import { SelectNetwork } from "./selectNetwork";

import { createQueryString, formatAmount } from "@/helpers";
import { useQueryPools } from "@/hooks";

const initialValues = {
  amount: "",
};

export const Form = () => {
  const { open } = useWeb3Modal();

  const [openAsset, setOpenAsset] = useState(false);
  const [openDestModal, setOpenDestModal] = useState(false);
  const [openFeeModal, setOpenFeeModal] = useState(false);
  const [openSourceModal, setOpenSourceModal] = useState(false);
  const [openMoveModal, setOpenMoveModal] = useState(false);

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
    tradingFreeBalance,
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
  const { extensionAccounts } = useExtensionAccounts();
  const hasSubstrateAccounts = (extensionAccounts?.length ?? 0) > 0;
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

  /*
   * Can the trading account cover what the funding account lacks?
   *
   * Polkadex-source only: on the EVM side there is no trading account. The tiny
   * epsilon absorbs float dust from the two balances being read on different
   * paths - without it, an exactly-covering trading balance can flicker between
   * offering the move and "insufficient".
   */
  // On mainnet the relayer fee comes out of the bridged asset, so the funding
  // account must hold amount + fee. Flag off (testnet) leaves this = parsedAmount.
  const fundingNeeded = useMemo(
    () =>
      totalFundingNeeded(parsedAmount, {
        feesEnabled: BRIDGE_MAINNET_FEES_ENABLED && !isEvmSource,
        relayerFee: BRIDGE_RELAYER_FEE,
      }),
    [parsedAmount, isEvmSource]
  );

  const coverableShortfall = useMemo(
    () =>
      computeCoverableShortfall({
        isEvmSource,
        amountNeeded: fundingNeeded,
        fundingBalance: selectedAssetBalance,
        tradingFreeBalance,
      }),
    [isEvmSource, fundingNeeded, selectedAssetBalance, tradingFreeBalance]
  );

  /** The primary button always states the next required step instead of
   *  sitting there disabled and gray with no explanation. Where the step is
   *  actionable (connect wallet, pick token), clicking performs it. */
  const primaryAction = useMemo(():
    | { label: string; onClick?: () => void; submit?: boolean }
    | { label: string; blocked: true } => {
    if (!sourceChain || !destinationChain)
      return { label: "Select networks", blocked: true };
    // Wording must match the account row beneath it. "Connect a wallet" and
    // "choose an account" are different asks, and which one applies depends on
    // whether an extension is already connected - not on which side of the
    // bridge you are looking at.
    if (!sourceAccount)
      return isEvmSource
        ? { label: `Connect ${sourceChain.name} wallet`, onClick: () => open() }
        : {
            label: hasSubstrateAccounts
              ? "Choose a source account"
              : `Connect ${sourceChain.name} wallet`,
            onClick: () => setOpenSourceModal(true),
          };
    if (!selectedAsset)
      return { label: "Select a token", onClick: () => setOpenAsset(true) };
    if (!destinationAccount)
      return isEvmSource
        ? {
            label: hasSubstrateAccounts
              ? "Choose a destination account"
              : `Connect ${destinationChain.name} wallet`,
            onClick: () => setOpenDestModal(true),
          }
        : {
            label: `Connect ${destinationChain.name} wallet`,
            onClick: () => open(),
          };
    if (!dirty || !parsedAmount)
      return { label: "Enter an amount", blocked: true };
    // Mainnet only: the bridge extrinsic needs PDEX gas from the funding
    // account. Without this gate the user passes every check and fails at
    // signing - possibly after waiting minutes for an auto-move to settle.
    if (
      !isEvmSource &&
      !hasGasForBridge(
        // sourceFeeBalance is the funding account's PDEX when Polkadex is the
        // source (see BridgeProvider's transferConfig).
        Number(transferConfig?.sourceFeeBalance?.amount ?? 0),
        BRIDGE_MIN_PDEX_FOR_GAS,
        BRIDGE_MAINNET_FEES_ENABLED
      )
    ) {
      return {
        label: `Need ${BRIDGE_MIN_PDEX_FOR_GAS} PDEX for network fees`,
        blocked: true,
      };
    }
    /*
     * BEFORE the insufficient-balance dead end: if funding is short but
     * funding + trading covers the transfer, the button offers to fix it
     * instead of just naming the problem. Consent and the actual move happen
     * in the modal; nothing is withdrawn from this click alone.
     */
    if (coverableShortfall > 0) {
      return {
        label: `Move ${formatAmount(coverableShortfall)} ${displayTicker} from Trading & Transfer`,
        onClick: () => setOpenMoveModal(true),
      };
    }
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
    coverableShortfall,
    hasSubstrateAccounts,
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
  // Rendered for the EVM side of the bridge, which is the SOURCE normally and
  // the DESTINATION once the direction is flipped. The chain name must be
  // passed in rather than read from sourceChain, or a flipped bridge labels
  // the EVM row with the Polkadot chain's name.
  const EvmWalletRow = ({
    account,
    chainName,
  }: {
    account?: { name?: string; address: string } | null;
    chainName?: string;
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
    // Names the network, not just "wallet": one row needs an Ethereum-family
    // wallet and the other a Polkadot one, and confusing the two is the single
    // most common mistake on this screen.
    return (
      <PendingAccountRow
        message={`No ${chainName ?? "Ethereum"} wallet connected`}
        actionLabel="Connect"
        onAction={open}
      />
    );
  };

  return (
    <Fragment>
      <MoveFromTradingModal
        open={openMoveModal}
        onOpenChange={setOpenMoveModal}
        amountNeeded={fundingNeeded}
        ticker={displayTicker}
      />
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
      <ConnectAccount
        open={openDestModal}
        onOpenChange={setOpenDestModal}
        setAccount={setDestinationAccount}
      />

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-5 max-w-[640px] mx-auto py-8 w-full px-4"
      >
        <div className="flex flex-col gap-6 border border-primary rounded-md bg-level-0 p-6 max-sm:p-4">
          <div className="flex flex-col gap-3">
            <Typography.Heading>Networks</Typography.Heading>
            {/* Both sides need an account. Stating that up front stops the
                second request reading like the first one failed.

                The noun follows the CHAIN, not the position: an EVM side is a
                browser "wallet" you connect, a Substrate side is an "account"
                you pick from the extension. Tying it to position meant a
                flipped bridge asked for a "Polkadex wallet" and a "Sepolia
                account", which is backwards on both counts. */}
            <ConnectionSteps
              sourceLabel={`${sourceChain?.name ?? "Source"} ${
                isEvmSource ? "wallet" : "account"
              }`}
              destinationLabel={`${destinationChain?.name ?? "Destination"} ${
                isEvmSource ? "account" : "wallet"
              }`}
              sourceDone={!!sourceAccount}
              destinationDone={!!destinationAccount}
            />
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
                {/* Substrate source: must be an account the user controls -
                    they sign the send. Same owned-accounts-only modal as the
                    destination; no pasted addresses. */}
                {isEvmSource ? (
                  <EvmWalletRow
                    account={sourceAccount}
                    chainName={sourceChain?.name}
                  />
                ) : sourceAccount ? (
                  <WalletCard
                    name={sourceAccount.name}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setOpenSourceModal(true);
                    }}
                  >
                    {sourceAccount.address}
                  </WalletCard>
                ) : (
                  // Mirrors the destination row exactly. This block was the
                  // last one still using a solid button and position-based
                  // wording ("source account"), so flipping the bridge showed
                  // two different control styles and two different vocabularies
                  // for the same job.
                  <PendingAccountRow
                    message={
                      hasSubstrateAccounts
                        ? `Choose which ${sourceChain?.name ?? "Polkadex"} account to send from`
                        : `No ${sourceChain?.name ?? "Polkadex"} wallet connected`
                    }
                    actionLabel={hasSubstrateAccounts ? "Choose" : "Connect"}
                    onAction={() => setOpenSourceModal(true)}
                  />
                )}
                {/* Asset & amount live with the SOURCE: what you send is a
                          source-side fact - the destination receives the same token. */}
                <div className="flex flex-col gap-2 mt-1">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <Typography.Text appearance="primary">
                        Amount
                      </Typography.Text>
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
                        showAmountError
                          ? "border-danger-base"
                          : "border-primary"
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
              </div>
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
              {/* Destination = Polkadex: the account must be one the user
                  controls - an address from the connected substrate wallet,
                  chosen through the same connect/select modal the source
                  side uses. No free-text/pasted addresses here. */}
              {isEvmSource ? (
                destinationAccount ? (
                  <WalletCard
                    name={destinationAccount.name}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setOpenDestModal(true);
                    }}
                  >
                    {destinationAccount.address}
                  </WalletCard>
                ) : (
                  // Distinguishes "you have accounts, pick one" from "you have
                  // no Polkadot wallet at all" - two very different next steps
                  // that both used to read "Connect wallet".
                  <PendingAccountRow
                    message={
                      hasSubstrateAccounts
                        ? `Choose which ${destinationChain?.name ?? "Polkadex"} account receives the funds`
                        : `No ${destinationChain?.name ?? "Polkadex"} wallet connected`
                    }
                    actionLabel={hasSubstrateAccounts ? "Choose" : "Connect"}
                    onAction={() => setOpenDestModal(true)}
                  />
                )
              ) : (
                <EvmWalletRow
                  account={destinationAccount}
                  chainName={destinationChain?.name}
                />
              )}
            </div>
          </div>

          {/* ── SUMMARY - what actually happens if you press Transfer ──── */}
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
                    ~10-30 min (Hyperbridge relay)
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
