import { useMutation } from "@tanstack/react-query";
import { useNativeApi } from "@orderbook/core/providers/public/nativeApi";
import BigNumber from "bignumber.js";
import { NOTIFICATIONS, UNIT_BN } from "@orderbook/core/constants";
import {
  ExtensionAccount,
  useTransactionManager,
} from "@polkadex/react-providers";
import { SubmittableExtrinsic } from "@polkadot/api/promise/types";

import { useSettingsProvider } from "../providers/public/settings";
import { appsyncOrderbookService } from "../utils/orderbookService";
import { handleTransaction } from "../helpers";

interface AssetTransferParams {
  asset: Record<string, string | null>;
  ticker: string;
  dest: string;
  amount: string;
  account: ExtensionAccount;
  tokenFeeId?: string;
}

export const useAssetTransfer = (onRefetch: () => Promise<void>) => {
  const { api } = useNativeApi();
  const { onHandleError, onHandleAlert, onPushNotification } =
    useSettingsProvider();

  const { addToTxQueue } = useTransactionManager();
  return useMutation({
    mutationFn: async ({
      asset,
      dest,
      amount,
      account,
      ticker,
      tokenFeeId,
    }: AssetTransferParams) => {
      if (!api?.isConnected)
        throw new Error("You are not connected to blockchain");

      const amountFormatted = new BigNumber(amount)
        .multipliedBy(UNIT_BN)
        .toString();

      const signedExtrinsic = (await appsyncOrderbookService.operation.transfer(
        {
          api,
          account,
          asset,
          amount: amountFormatted,
          dest,
          tokenFeeId,
        }
      )) as SubmittableExtrinsic;
      addToTxQueue(signedExtrinsic);
      await handleTransaction(signedExtrinsic);

      return { asset: ticker, amount };
    },
    onError: (error: { message: string }) =>
      onHandleError(error?.message ?? error),
    onSuccess: async (e) => {
      await onRefetch();
      onHandleAlert(
        "Deposit sent successfully. Please wait a few seconds to see the transaction in the history."
      );
      onPushNotification(NOTIFICATIONS.customTransfer(e));
    },
  });
};
