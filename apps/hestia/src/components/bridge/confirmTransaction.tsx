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
} from "@mitrabook/ux";
import {
  RiFileCopyLine,
  RiGasStationLine,
  RiInformationFill,
} from "@remixicon/react";
import { Dispatch, SetStateAction, useMemo, useState } from "react";
import { useSwitchChain } from "wagmi";
import { getAccount, getWalletClient } from "wagmi/actions";
import {
  CrossChainError,
  AUTOSWAP_QUOTE_AMOUNT,
  parseScientific,
} from "@orderbook/core/index";
import { useSettingsProvider } from "@orderbook/core/providers/public/settings";
import { useConnectWalletProvider } from "@orderbook/core/providers/user/connectWalletProvider";
import { formatDisplay } from "@orderbook/format";
// Same import as ethereumToSubstrate's transferTokens, deliberately: the check
// must decode the address exactly the way the transfer does.
import { decodeAddress } from "@polkadot/keyring";
import { u8aToHex } from "@polkadot/util";

import { useBridgeProvider } from "./BridgeProvider";
import {
  blocksSubmission,
  describeFee,
  describeFeeSource,
  feeVerdict,
} from "./feeVerdict";
import { checkDestination, describeDestination } from "./destinationCheck";

import { transferTokens } from "@/lib/hyperbridge/ethereumToSubstrate";
import { describeRpcError } from "@/lib/hyperbridge/rpcTransport";
import { usePool } from "@/hooks";
import {
  ErrorMessage,
  GenericHorizontalItem,
  Terms,
} from "@/components/ui/ReadyToUse";
import { formatAmount } from "@/helpers";
import {
  BRIDGE_MAINNET_FEES_ENABLED,
  BRIDGE_RELAYER_FEE,
} from "@/config/bridgeFees";
import { transferSubstrateToEvm } from "@/lib/hyperbridge/substrateToEthereum";
import { config as wagmiConfig } from "@/config/wagmi";
import { BRIDGE_CHAINS } from "@/config/bridge";
import type { EvmChainConfig } from "@/config/bridge";

const SEPOLIA_CHAIN_ID = (BRIDGE_CHAINS.sepolia as EvmChainConfig).chainId;

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
    isEvmSource,
    substrateAssetIds,
    sourceChain,
  } = useBridgeProvider();
  const { destinationFee, sourceFee, sourceFeeBalance, sourceFeeExistential } =
    transferConfig ?? {};

  const { onHandleAlert, onHandleError } = useSettingsProvider();
  const { selectedWallet } = useConnectWalletProvider();
  const { switchChainAsync } = useSwitchChain();

  const showAutoSwap = useMemo(
    () => isDestinationPolkadex && !destinationPDEXBalance,
    [isDestinationPolkadex, destinationPDEXBalance]
  );

  const { swapPrice: swapPriceRaw = 0, swapLoading } = usePool({
    asset: selectedAssetIdPolkadex,
    amount: AUTOSWAP_QUOTE_AMOUNT,
    enabled: showAutoSwap,
  });

  const shortSourceAddress = useMemo(
    () => truncateString(sourceAccount?.address ?? "", 4),
    [sourceAccount?.address]
  );

  // The same label the dialog already prints as "Source Wallet", reused so the
  // fee explanation points at an account the user can see on screen rather than
  // at an abstract "source chain".
  const sourceWalletLabel = useMemo(
    () =>
      sourceAccount?.name
        ? `${sourceAccount.name} ${shortSourceAddress}`
        : shortSourceAddress || null,
    [sourceAccount?.name, shortSourceAddress]
  );

  const shortDestinationAddress = useMemo(
    () => truncateString(destinationAccount?.address ?? "", 4),
    [destinationAccount?.address]
  );
  const [isLoading, setIsLoading] = useState(false);

  // The old check was `balance <= fee + existential` with both sides defaulting
  // to 0, so an unfinished or failed fee estimate produced a confident
  // "Insufficient balance" - an accusation built from missing data. It also
  // rejected a balance exactly equal to the fee. feeVerdict distinguishes
  // estimating / unknown / insufficient, and only the last two block.
  const verdict = useMemo(
    () =>
      feeVerdict({
        feeAmount: sourceFee?.amount,
        feeTicker: sourceFee?.ticker ?? sourceFeeBalance?.ticker,
        balanceAmount: sourceFeeBalance?.amount,
        balanceTicker: sourceFeeBalance?.ticker,
        existential: sourceFeeExistential?.amount,
        // Bridging native ETH spends the same balance that pays the gas, so
        // the amount has to be part of the sum. Passing the ticker lets
        // feeVerdict decide - it is a no-op on the USDC/WETH routes.
        transferAmount: amount,
        transferTicker: selectedAsset?.ticker,
        estimating: transferConfigLoading,
      }),
    [
      sourceFee?.amount,
      sourceFee?.ticker,
      sourceFeeBalance?.amount,
      sourceFeeBalance?.ticker,
      sourceFeeExistential?.amount,
      amount,
      selectedAsset?.ticker,
      transferConfigLoading,
    ]
  );

  const feeLine = describeFee(
    verdict,
    sourceFee?.ticker ?? sourceFeeBalance?.ticker
  );
  const feeSourceLine = describeFeeSource(verdict, sourceWalletLabel);

  /*
   * The bridge keeps its own substrate account, chosen from the raw extension
   * list, with no link to the account the rest of the app is signed in as. A
   * tester bridged 0.01 ETH to "Substrate Account 1" while signed in as "test
   * account" and spent fifteen hours believing the funds were lost - the app
   * only ever displays the signed-in account, so a transfer to a sibling
   * account in the same wallet is indistinguishable from one that vanished.
   *
   * Only warns when the destination is a genuinely different KEY. Comparing
   * printed addresses would fire on every transfer, because Polkadex renders
   * SS58 prefix 88 and extensions commonly hand back 42 or 0.
   */
  const destinationWarning = useMemo(() => {
    // Only meaningful in the evm-to-substrate direction; the substrate-to-evm
    // destination is a MetaMask address with no signed-in counterpart.
    if (!isEvmSource) return null;
    return describeDestination(
      checkDestination({
        destinationAddress: destinationAccount?.address,
        destinationName: destinationAccount?.name,
        signedInAddress: selectedWallet?.address,
        signedInName: selectedWallet?.name,
        toPublicKey: (address) => u8aToHex(decodeAddress(address, false)),
      })
    );
  }, [
    isEvmSource,
    destinationAccount?.address,
    destinationAccount?.name,
    selectedWallet?.address,
    selectedWallet?.name,
  ]);

  const error = useMemo(() => {
    const swapPrice = Number(swapPriceRaw);
    const autoSwapAmount = showAutoSwap ? swapPrice : 0;

    if (blocksSubmission(verdict))
      return describeFeeSource(verdict, sourceWalletLabel);
    // if (showAutoSwap && !swapPrice) return CrossChainError.NOT_ENOUGH_LIQUIDITY;

    if (showAutoSwap && amount <= autoSwapAmount)
      return CrossChainError.AUTO_SWAP(
        autoSwapAmount.toFixed(4),
        selectedAsset?.ticker as string
      );
  }, [
    amount,
    selectedAsset?.ticker,
    showAutoSwap,
    swapPriceRaw,
    verdict,
    sourceWalletLabel,
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
  ] = useMemo(() => {
    // "Ø" is gone from the breakdown too. It conflated a zero fee, an
    // in-flight estimate and a failed one, and it blanked the TICKER alongside
    // the amount - so the hover card could not answer "in what currency?"
    // either. The ticker is known before the amount is; always show it.
    const destValue = destinationFee?.amount;
    const sourceValue = sourceFee?.amount;
    const show = (v: number | null | undefined) =>
      v === null || v === undefined ? "Not available" : `~ ${formatAmount(v)}`;
    return [
      show(destValue),
      destinationFee?.ticker ?? "",
      show(sourceValue),
      sourceFee?.ticker ?? "",
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
                    tooltip={`In order to bridge your funds and sign transactions on Polkadex, you must have at least ${AUTOSWAP_QUOTE_AMOUNT} PDEX in your destination wallet. Your current destination wallet balance is ${destinationPDEXBalance} PDEX.
                  A small part of your transfer will be auto-swapped to PDEX to meet this requirement.`}
                    defaultOpen
                  >
                    <div className="flex items-center gap-1">
                      <RiGasStationLine className="w-3.5 h-3.5 text-secondary" />
                      <Skeleton loading={swapLoading} className="min-h-4 w-10">
                        <div className="flex items-center gap-1">
                          <Typography.Text>
                            {Number(swapPriceRaw) > 0
                              ? `${formatDisplay(Number(swapPriceRaw))} ${selectedAsset?.ticker}`
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
                        <Typography.Text>{feeLine}</Typography.Text>
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
                    {showAutoSwap && Number(swapPriceRaw) > 0 && (
                      <ResponsiveCard label="Auto swap">
                        {formatDisplay(Number(swapPriceRaw))}{" "}
                        {selectedAsset?.ticker}
                      </ResponsiveCard>
                    )}
                  </HoverInformation.Content>
                </HoverInformation>
                {/* Which account pays, in which currency, and what is left.
                    The reported dialog answered none of those. Suppressed when
                    the verdict already blocks, since the error below says it. */}
                {feeSourceLine && !blocksSubmission(verdict) && (
                  <Typography.Text
                    appearance="secondary"
                    size="xs"
                    className="px-3 pb-3"
                  >
                    {feeSourceLine}
                  </Typography.Text>
                )}
                {/* Sending somewhere other than the signed-in account is
                    legitimate, so this warns rather than blocks - but it has to
                    be readable BEFORE signing, which is the whole failure. */}
                {destinationWarning && (
                  <Typography.Text
                    appearance="primary"
                    size="xs"
                    className="px-3 pb-3"
                  >
                    {destinationWarning}
                  </Typography.Text>
                )}
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
                onClick={async () => {
                  try {
                    setIsLoading(true);

                    if (isEvmSource) {
                      // EVM (Sepolia) → Substrate (Polkadex)
                      const account = getAccount(wagmiConfig);
                      if (!account.isConnected || !account.address) {
                        throw new Error(
                          // Name the chain, not the family: "EVM" appears
                          // nowhere else the user can see.
                          `Connect a ${sourceChain?.name ?? "Sepolia Testnet"} wallet before submitting.`
                        );
                      }

                      try {
                        await switchChainAsync({ chainId: SEPOLIA_CHAIN_ID });
                      } catch {
                        throw new Error(
                          "Please switch your wallet's network to Sepolia and try again."
                        );
                      }

                      const walletClient = await getWalletClient(wagmiConfig, {
                        chainId: SEPOLIA_CHAIN_ID,
                      });

                      await transferTokens({
                        amount,
                        recipient: destinationAccount?.address,
                        token: selectedAsset,
                        walletClient,
                        address: account.address,
                      });
                    } else {
                      // Substrate (Polkadex) → EVM (Sepolia)
                      // Prefer assetId discovered from chain metadata; fall back to
                      // static config (WETH hardcoded as "3") only if not yet loaded.
                      const discoveredId = substrateAssetIds.get(
                        selectedAsset?.ticker?.toUpperCase() ?? ""
                      );
                      const staticId = selectedAsset?.chains.polkadex?.assetId;
                      const resolvedAssetId = discoveredId ?? staticId;
                      if (!resolvedAssetId) {
                        throw new Error(
                          `Asset ID for ${selectedAsset?.ticker} on Polkadex is not yet known. ` +
                            "Please wait a moment for the chain data to load and try again."
                        );
                      }
                      await transferSubstrateToEvm({
                        amount,
                        recipient: destinationAccount?.address,
                        senderAddress: sourceAccount?.address,
                        // 0 unless the mainnet fee flag is on. The form has
                        // already budgeted funding for amount + fee when it is.
                        relayerFee: BRIDGE_MAINNET_FEES_ENABLED
                          ? BRIDGE_RELAYER_FEE
                          : 0,
                        decimals: selectedAsset?.decimals,
                        assetId: Number(resolvedAssetId),
                      });
                    }

                    onHandleAlert(
                      "These tokens will reflect in your Funding wallet in 2-3 mins"
                    );
                    onSuccess();
                  } catch (e) {
                    // RPC provider failures (rate limit, plan paywall,
                    // unreachable endpoint) get a plain-language message. viem's
                    // raw text is a dump of the request body, contract address,
                    // function name, a docs link and a version string - which
                    // told a user nothing about whether their funds were at
                    // risk. Unrecognised errors keep their original message
                    // rather than being flattened into something vague.
                    onHandleError(
                      describeRpcError(e) ??
                        (e instanceof Error
                          ? e.message
                          : "Failed to transfer tokens")
                    );
                    console.error("Bridge Error:", e);
                  } finally {
                    setIsLoading(false);
                  }
                }}
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
