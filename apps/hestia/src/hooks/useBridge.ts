// TODO: Move this to packages/core/hooks
import { useTheaProvider } from "@orderbook/core/providers";
import { SubmittableExtrinsic } from "@polkadot/api/promise/types";
import { useMutation } from "@tanstack/react-query";
import { useSettingsProvider } from "@orderbook/core/providers/public/settings";
import { sleep } from "@orderbook/core/helpers";
import { NOTIFICATIONS } from "@orderbook/core/constants";
import { Chain } from "@polkadex/thea";
import { signAndSubmitPromiseWrapper } from "@polkadex/blockchain-api";

export function useBridge({ onSuccess }: { onSuccess: () => void }) {
  const { onHandleAlert, onHandleError, onPushNotification } =
    useSettingsProvider();
  const {
    transferConfig,
    sourceAccount,
    isSourcePolkadex,
    isDestinationPolkadex,
    destinationPDEXBalance,
    onRefetchSourceBalances,
    selectedAsset,
    destinationChain,
    destinationConnector,
    destinationAccount,
    onRefetchTransferConfig,
  } = useTheaProvider();

  return useMutation({
    mutationFn: async ({ amount }: { amount: number }) => {
      if (!transferConfig || !sourceAccount) {
        throw new Error("Bridge issue");
      }

      /* Checks for Source chain */
      if (
        transferConfig.sourceFeeBalance.amount -
          transferConfig.sourceFee.amount <=
        transferConfig.sourceFeeExistential.amount
      ) {
        throw new Error(
          "Insufficient balance to pay the transaction fee at source chain"
        );
      }

      /* Checks for Destination chain */
      const isPolkadexAutoSwap =
        isDestinationPolkadex && !destinationPDEXBalance;
      if (
        !isPolkadexAutoSwap && // Ensure there is no Autoswap
        selectedAsset?.ticker !==
          transferConfig.destinationNativeExistential.ticker // Ensure it's a non-native asset for destination chain
      ) {
        const destinationAsset =
          destinationConnector
            ?.getAllAssets()
            .filter(
              (a) =>
                a.ticker === transferConfig.destinationNativeExistential.ticker
            ) || [];

        const destinationNativeBalance =
          (
            await destinationConnector?.getBalances(
              destinationAccount?.address as string,
              destinationAsset
            )
          )?.[0]?.amount || 0;

        // Ensure that destination account have native balance more than existential amount
        if (
          destinationNativeBalance <=
          transferConfig.destinationNativeExistential.amount
        ) {
          throw new Error(
            "Insufficient native token balance at the destination chain"
          );
        }
      }

      // For DED and PINK withdrawal
      if (
        destinationChain?.name === "AssetHub" &&
        ["DED", "PINK"].includes(selectedAsset?.ticker || "")
      ) {
        const usdtAsset =
          destinationConnector
            ?.getAllAssets()
            .filter((a) => a.ticker === "USDT") || [];

        const usdtBalance =
          (
            await destinationConnector?.getBalances(
              destinationAccount?.address as string,
              usdtAsset
            )
          )?.[0]?.amount || 0;

        if (usdtBalance < 0.7)
          throw new Error(
            `Insufficient USDT balance to cover the existential deposit on AssetHub`
          );
      }

      const ext = await transferConfig.transfer<SubmittableExtrinsic>(amount);

      await signAndSubmitPromiseWrapper({
        signer: sourceAccount.signer,
        tx: ext,
        address: sourceAccount.address,
        criteria: "IS_FINALIZED",
      });

      onSuccess();
      onHandleAlert(
        "Transfer Success. Expect tokens on the destination chain in a few minutes"
      );
      if (isSourcePolkadex) await sleep(4000);
      await onRefetchSourceBalances?.();
      await onRefetchTransferConfig?.();
      return amount;
    },
    onError: (error: Error) => onHandleError?.(error.message),
    onSuccess: (amount: number) =>
      onPushNotification(
        NOTIFICATIONS.crossChainTransfer({
          sourceChain: transferConfig?.sourceChain as Chain,
          destinationChain: transferConfig?.destinationChain as Chain,
          asset: selectedAsset?.ticker as string,
          amount,
        })
      ),
  });
}
