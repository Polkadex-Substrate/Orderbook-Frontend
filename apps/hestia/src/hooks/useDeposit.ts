// TODO: Move this to packages/core/hooks
import { SubmittableExtrinsic } from "@polkadot/api/promise/types";
import { useMutation } from "@tanstack/react-query";
import { useSettingsProvider } from "@orderbook/core/providers/public/settings";
import { NOTIFICATIONS } from "@orderbook/core/constants";
import { Chain } from "@polkadex/thea";
import { signAndSubmitPromiseWrapper } from "@polkadex/blockchain-api";
import { useDirectDepositProvider } from "@orderbook/core/providers/user/sendAndReceive";
import { useNativeApi } from "@orderbook/core/providers/public/nativeApi";
import { useOrderbookService } from "@orderbook/core/providers/public/orderbookServiceProvider/useOrderbookService";
import { useTransactionManager } from "@polkadex/react-providers";
import { appsyncOrderbookService } from "@orderbook/core/utils/orderbookService";
import { handleTransaction } from "@orderbook/core/helpers";

export function useDeposit({ onSuccess }: { onSuccess: () => void }) {
  const { onHandleAlert, onHandleError, onPushNotification, onHandleInfo } =
    useSettingsProvider();
  const {
    sourceChain,
    transferConfig,
    sourceAccount,
    destinationPDEXBalance,
    onRefetchSourceBalances,
    selectedAsset,
    destinationAccount,
    onRefetchTransferConfig,
    isSourcePolkadex,
  } = useDirectDepositProvider();

  const { api } = useNativeApi();
  const { isReady } = useOrderbookService();
  const { addToTxQueue } = useTransactionManager();

  return useMutation({
    mutationFn: async ({ amount }: { amount: number }) => {
      // When Source is Polkadex - Logic for transfer from funding to trading
      if (isSourcePolkadex) {
        if (!isReady) throw new Error("Orderbook service not initialized");

        if (!api || !api?.isConnected)
          throw new Error("You are not connected to blockchain");

        if (!sourceAccount || sourceAccount?.address?.trim().length === 0)
          throw new Error("Invalid account");

        onHandleInfo?.("Processing Deposit...");

        const asset = selectedAsset?.id
          ? { asset: selectedAsset?.id || null }
          : { polkadex: null };

        const signedExtrinsic = await appsyncOrderbookService.operation.deposit(
          {
            api,
            account: sourceAccount,
            asset: asset as unknown as Record<string, string | null>,
            amount,
            tokenFeeId: "PDEX",
          }
        );
        addToTxQueue(signedExtrinsic);
        await handleTransaction(signedExtrinsic);
        onSuccess();
        onHandleAlert(
          "Deposit Success. Expect tokens in the orderbook in a few minutes"
        );
        return amount;
      }

      if (!transferConfig || !sourceAccount || !destinationAccount) {
        throw new Error("Deposit issue");
      }

      onHandleInfo?.("Processing Deposit...");

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
      const isPolkadexAutoSwap = !destinationPDEXBalance;
      if (
        !isPolkadexAutoSwap && // Ensure there is no Autoswap
        selectedAsset?.ticker !==
          transferConfig.destinationNativeExistential.ticker // Ensure it's a non-native asset for destination chain
      ) {
        // Ensure that destination account have native balance more than existential amount
        if (
          destinationPDEXBalance <=
          transferConfig.destinationNativeExistential.amount
        ) {
          throw new Error(
            "Insufficient native token balance at the destination chain"
          );
        }
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
        "Deposit Success. Expect tokens in the orderbook in a few minutes"
      );
      await onRefetchSourceBalances?.();
      await onRefetchTransferConfig?.();
      return amount;
    },
    onError: (error: Error) => onHandleError?.(error.message),
    onSuccess: (amount: number) =>
      onPushNotification(
        NOTIFICATIONS.directDeposit({
          sourceChain: sourceChain as Chain,
          asset: selectedAsset?.ticker as string,
          amount,
        })
      ),
  });
}
