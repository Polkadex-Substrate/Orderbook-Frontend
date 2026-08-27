"use client";

import {
  Typography,
  Token,
  Button,
  Skeleton,
  tokenAppearance,
  Tooltip,
  Modal,
  Spinner,
} from "@mitrabook/ux";
import {
  Fragment,
  MouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { RiArrowDownSLine, RiArrowLeftRightLine } from "@remixicon/react";
import classNames from "classnames";
import {
  TradeAccountType,
  useConnectWalletProvider,
} from "@orderbook/core/providers/user/connectWalletProvider";
import {
  isAssetPDEX,
  parseScientific,
  trimFloat,
  tryUnlockTradeAccount,
} from "@orderbook/core/helpers";
import {
  ESTIMATED_FEE,
  OTHER_ASSET_EXISTENTIAL,
} from "@orderbook/core/constants";
import { useFormik } from "formik";
import {
  depositValidations,
  withdrawValidations,
} from "@orderbook/core/validations";
import { useSettingsProvider } from "@orderbook/core/providers/public/settings";
import {
  useAssetTransfer,
  useCall,
  useDeposit,
  useFunds,
  useTransactionFeeModal,
  useWithdraw,
} from "@orderbook/core/hooks";
import { ExtensionAccount } from "@aksumite/react-providers";

import { FromFunding } from "./fromFunding";
import { FromTrading } from "./FromTrading";

import { FilteredAssetProps, SwitchType } from "@/hooks";
import { UnlockAccount } from "@/components/ui/ReadyToUse/unlockAccount";
import { ConfirmTransaction } from "@/components/ui/ConnectWallet/confirmTransaction";
import { getChainFromTicker } from "@/config/assetChain";
/*
 * EMPTY, not 0.
 *
 * `amount: 0.0` renders a literal "0" in the field, so typing "60" produces
 * "060" - the value is appended to the zero rather than replacing it, and the
 * only workaround is to select-all first. Reported from the testnet.
 *
 * An empty string is also the honest initial state: the user has not entered an
 * amount, and 0 is a value they did not choose. The validation schema already
 * treats empty as required-and-missing, so nothing downstream needs to change.
 */
const initialValues = { amount: "" };
export const Form = ({
  isBalanceFetching,
  refetch,
  selectedAsset,
  onAssetsInteraction,
  assetsInteraction,
  type,
  onChangeType,
}: {
  selectedAsset: FilteredAssetProps;
  onAssetsInteraction: (callback?: () => void) => void;
  type: SwitchType;
  onChangeType: (e: SwitchType) => void;
  assetsInteraction?: boolean;
  isBalanceFetching: boolean;
  refetch: () => Promise<void>;
}) => {
  const [cardFocus, setCardFocus] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedExtensionAccount, setSelectedExtensionAccount] =
    useState<ExtensionAccount | null>(null);

  const formRef = useRef<HTMLFormElement | null>(null);

  const isTransferFromFunding = type === "deposit";
  const isFundingToFunding = type === "transfer";
  const isFromFunding = isTransferFromFunding || isFundingToFunding;

  const isPolkadexToken = useMemo(
    () => isAssetPDEX(selectedAsset?.id),
    [selectedAsset?.id]
  );

  const asset = useMemo(
    (): Record<string, string | null> =>
      isPolkadexToken
        ? { polkadex: null }
        : { asset: selectedAsset?.id || null },
    [isPolkadexToken, selectedAsset?.id]
  );

  const { selectedTradingAccount, selectedWallet } = useConnectWalletProvider();
  const { loading: depositLoading, mutateAsync: onFetchDeposit } = useDeposit();
  const { mutateAsync: onFetchWithdraws, loading: withdrawLoading } =
    useWithdraw();

  const { mutateAsync, isPending: transferLoading } = useAssetTransfer(refetch);
  const { loading: fundLoading, onChangeChainBalance } = useFunds();

  const { onToogleConnectTrading, onToogleConnectExtension } =
    useSettingsProvider();

  const chainName = useMemo(
    () => getChainFromTicker(selectedAsset?.ticker) || selectedAsset?.name,
    [selectedAsset?.ticker, selectedAsset?.name]
  );

  const existentialBalance = useMemo(
    () => (isPolkadexToken ? 1 : OTHER_ASSET_EXISTENTIAL),
    [isPolkadexToken]
  );

  const onChangeFundingMax = () => {
    const onChainBalance = Number(selectedAsset?.onChainBalance);
    if (onChainBalance > existentialBalance) {
      let balance = onChainBalance - existentialBalance;
      if (isPolkadexToken) balance = Math.max(balance - ESTIMATED_FEE, 0);
      const trimmedBalance = +trimFloat({ value: balance });
      const formattedBalance = parseScientific(trimmedBalance.toString());
      setFieldValue("amount", formattedBalance);
    } else setFieldValue("amount", "");
  };

  const onChangeTradingMax = () => {
    const availableAmount = Number(selectedAsset?.free_balance);
    const trimmedBalance = trimFloat({ value: availableAmount });
    const formattedBalance = parseScientific(trimmedBalance);
    setFieldValue("amount", formattedBalance);
  };

  const handleMax = (e: MouseEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    isTransferFromFunding || isFundingToFunding
      ? onChangeFundingMax()
      : onChangeTradingMax();
  };

  const handleChanteType = (e: MouseEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    resetForm();
    onChangeType(isFromFunding ? "withdraw" : "deposit");
  };

  const validationSchema = useMemo(
    () =>
      isFromFunding
        ? depositValidations(
            Number(selectedAsset?.onChainBalance) ?? 0,
            isPolkadexToken,
            existentialBalance
          )
        : withdrawValidations(selectedAsset?.free_balance ?? "0"),
    [
      existentialBalance,
      isPolkadexToken,
      selectedAsset?.free_balance,
      selectedAsset?.onChainBalance,
      isFromFunding,
    ]
  );

  /*
   * `amount` arrives as a STRING now that the field starts empty rather than at
   * 0 - see initialValues. Coerced once, at the boundary, rather than letting a
   * string reach an API that expects a number.
   */
  const onSubmitWithdraw = async ({ amount }: { amount: string | number }) => {
    if (selectedTradingAccount?.account?.isLocked) setShowPassword(true);
    else {
      const asset = isAssetPDEX(selectedAsset?.id) ? "PDEX" : selectedAsset?.id;
      if (!asset) return;
      try {
        // The typed STRING, not Number(amount): the withdraw payload's amount
        // is signed and verified as a string byte-for-byte, and a Number round
        // trip turns small amounts into scientific notation the backend
        // rejects. See createWithdrawHelpers.ts.
        await onFetchWithdraws({ asset, amount: String(amount).trim() });
      } finally {
        resetForm({ values: initialValues });
      }
    }
  };

  const onSubmitDeposit = async ({ amount }: { amount: string | number }) => {
    if (!hasTokenFee || (hasTokenFee && !openFeeModal)) onOpenFeeModal();
    else {
      if (!selectedWallet) return;
      try {
        await onFetchDeposit({
          asset,
          amount: Number(amount),
          account: selectedWallet,
          tokenFeeId: tokenFee?.id,
        });
      } finally {
        resetForm({ values: initialValues });
        setOpenFeeModal(false);
      }
    }
  };

  const onSubmitTransfer = async ({ amount }: { amount: string | number }) => {
    if (!selectedWallet || !selectedExtensionAccount?.address) return;
    try {
      const destAddress = selectedExtensionAccount?.address;

      const asset: Record<string, string | null> = isPolkadexToken
        ? { polkadex: null }
        : { asset: selectedAsset?.id || null };

      await mutateAsync({
        asset,
        dest: destAddress,
        amount: String(amount),
        account: selectedWallet,
        ticker: selectedAsset?.ticker,
      });
    } finally {
      resetForm({ values: initialValues });
      const asset = isPolkadexToken ? "PDEX" : selectedAsset?.id || "PDEX";
      onChangeChainBalance(asset);
    }
  };

  const onHandleSubmit = isTransferFromFunding
    ? onSubmitDeposit
    : onSubmitWithdraw;
  const {
    values,
    handleSubmit,
    resetForm,
    errors,
    getFieldProps,
    isValid,
    dirty,
    setFieldValue,
    setErrors,
  } = useFormik({
    initialValues,
    validationSchema,
    validateOnChange: true,
    validateOnBlur: true,
    onSubmit: isFundingToFunding ? onSubmitTransfer : onHandleSubmit,
  });
  const isLocalAccountPresent = !!Object.keys(selectedTradingAccount ?? {})
    .length;
  const isExtensionAccountPresent = !!Object.keys(selectedWallet ?? {}).length;

  const hasAccount = isFromFunding
    ? isExtensionAccountPresent
    : isLocalAccountPresent;

  const formLoading = isTransferFromFunding ? depositLoading : withdrawLoading;
  const loading = isFundingToFunding
    ? transferLoading || fundLoading
    : formLoading;

  const disabled = !hasAccount || loading || !(isValid && dirty);

  useEffect(() => {
    if (!isTransferFromFunding)
      tryUnlockTradeAccount(selectedTradingAccount?.account);
  }, [selectedTradingAccount, isTransferFromFunding]);

  const { onDepositOcex } = useCall();
  const {
    hasTokenFee,
    openFeeModal,
    onOpenFeeModal,
    setOpenFeeModal,
    tokenFee,
    setTokenFee,
  } = useTransactionFeeModal();
  return (
    <Fragment>
      <ConfirmTransaction
        action={() =>
          formRef?.current?.dispatchEvent(
            new Event("submit", { cancelable: true, bubbles: true })
          )
        }
        actionLoading={!!loading}
        extrinsicFn={
          () => onDepositOcex([asset as unknown as string, values.amount]) // TODO: Fix types
        }
        sender={selectedWallet?.address ?? ""}
        tokenFee={tokenFee}
        setTokenFee={setTokenFee}
        openFeeModal={openFeeModal}
        setOpenFeeModal={setOpenFeeModal}
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
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="flex w-full border-b border-primary max-md:py-6 md:py-8 bg-level-0 px-2"
      >
        <div className="flex-1 flex flex-col gap-4 w-full max-w-[1000px] mx-auto">
          <div className="flex-1 flex max-lg:flex-col items-center w-full border-y border-primary">
            <FromFunding
              isLocalAccountPresent={isLocalAccountPresent}
              isExtensionAccountPresent={isExtensionAccountPresent}
              isBalanceFetching={isBalanceFetching}
              focused={cardFocus}
              fromFunding={isFromFunding}
              extensionAccountName={selectedWallet?.name}
              extensionAccountAddress={selectedWallet?.address}
              extensionAccountBalance={selectedAsset?.onChainBalance}
              localAccountName={
                selectedTradingAccount?.type === TradeAccountType.Keyring
                  ? selectedTradingAccount?.account?.meta?.name
                  : selectedWallet?.name
              }
              localAccountAddress={
                selectedTradingAccount?.type === TradeAccountType.Keyring
                  ? selectedTradingAccount?.account?.address
                  : selectedWallet?.address
              }
              localAccountBalance={selectedAsset?.free_balance}
              selectedAssetTicker={selectedAsset?.ticker}
            />

            <button
              onClick={handleChanteType}
              className="h-full flex items-center justify-center p-2 max-lg:w-full max-lg:border-y border-primary hover:bg-level-1 duration-300 transition-colors"
            >
              <RiArrowLeftRightLine
                className={classNames(
                  "w-6 h-6 transition-all duration-300",
                  isFromFunding
                    ? "max-lg:rotate-90"
                    : "max-lg:rotate-[450deg] rotate-[360deg]"
                )}
              />
            </button>
            <FromTrading
              isExtensionAccountPresent={isExtensionAccountPresent}
              isBalanceFetching={isBalanceFetching}
              fromFunding={isTransferFromFunding}
              extensionAccountName={selectedWallet?.name}
              extensionAccountAddress={selectedWallet?.address}
              extensionAccountBalance={selectedAsset?.onChainBalance}
              localAccountBalance={selectedAsset?.free_balance}
              selectedAssetTicker={selectedAsset?.ticker}
              onChangeDirection={(e) => {
                resetForm();
                onChangeType(e);
              }}
              isFundingToFunding={isFundingToFunding}
              type={type}
              selectedExtensionAccount={selectedExtensionAccount}
              setSelectedExtensionAccount={setSelectedExtensionAccount}
            />
          </div>
          <div className="flex items-center border border-primary max-sm:flex-col">
            <div
              role="button"
              onClick={() => onAssetsInteraction()}
              className="flex items-center justify-between gap-4 px-5 py-4 max-sm:w-full max-sm:border-b sm:border-r border-primary hover:bg-level-1 duration-300 transition-colors min-w-60"
            >
              <div className="flex items-center gap-2 flex-1">
                <Skeleton
                  loading={!selectedAsset?.ticker}
                  className="w-10 h-10"
                >
                  <Token
                    name={selectedAsset?.ticker}
                    appearance={
                      selectedAsset?.ticker as keyof typeof tokenAppearance
                    }
                    className="w-8 h-8 border border-primary rounded-full"
                  />
                </Skeleton>
                <div
                  className={classNames(
                    "flex flex-col flex-1",
                    !selectedAsset && "gap-2"
                  )}
                >
                  <Skeleton
                    loading={!selectedAsset?.ticker}
                    className="flex-1 min-h-4"
                  >
                    <Typography.Text size="md" bold>
                      {selectedAsset?.ticker}
                    </Typography.Text>
                  </Skeleton>
                  <Skeleton
                    loading={!selectedAsset?.ticker}
                    className="flex-1 min-h-4"
                  >
                    <Typography.Text
                      appearance="primary"
                      size="sm"
                      className="whitespace-nowrap"
                    >
                      {chainName}
                    </Typography.Text>
                  </Skeleton>
                </div>
              </div>
              <div>
                <RiArrowDownSLine className="w-4 h-4" />
              </div>
            </div>
            <div
              className={classNames(
                "w-full flex items-center justify-between gap-2 pr-4 h-full",
                !!errors.amount && "border-danger-base border rounded-md"
              )}
            >
              <Tooltip open={!!errors.amount && !assetsInteraction}>
                <Tooltip.Trigger asChild>
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="0.000000000"
                    /* `max-sm:focus:text-[16px]` matches the other fourteen
                       inputs in this app. iOS Safari zooms the whole page when
                       a focused input's font-size is under 16px, and the app's
                       `text-base` is 0.80rem, so every field is under it. This
                       one input was missed, which made the transfer amount the
                       only field that jerks the layout on an iPhone. */
                    className="max-sm:focus:text-[16px] text-current flex-1 p-4 bg-transparent"
                    onFocus={() => setCardFocus(true)}
                    disabled={loading}
                    {...getFieldProps("amount")}
                    onBlur={() => {
                      setCardFocus(false);
                      setErrors({});
                    }}
                  />
                </Tooltip.Trigger>
                <Tooltip.Content className="bg-level-5 z-[1]">
                  {errors.amount && errors.amount}
                </Tooltip.Content>
              </Tooltip>
              <Button.Solid
                appearance="secondary"
                size="xs"
                onMouseEnter={() => setCardFocus(true)}
                onMouseLeave={() => setCardFocus(false)}
                onClick={handleMax}
                disabled={loading}
              >
                MAX
              </Button.Solid>
            </div>
          </div>
          {!hasAccount ? (
            <Button.Solid
              type="button"
              appearance="primary"
              size="md"
              className="w-full py-5"
              onClick={() =>
                isFromFunding
                  ? onToogleConnectExtension()
                  : onToogleConnectTrading()
              }
            >
              Connect your account
            </Button.Solid>
          ) : (
            <Button.Solid
              type="submit"
              disabled={disabled}
              appearance={loading ? "secondary" : "primary"}
              size="md"
              className="w-full py-5"
            >
              {loading ? <Spinner.Keyboard className="w-5 h-5" /> : "Transfer"}
            </Button.Solid>
          )}
        </div>
      </form>
    </Fragment>
  );
};
