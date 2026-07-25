import { useMutation } from "@tanstack/react-query";
import {
  ExtensionAccount,
  useTransactionManager,
} from "@polkadex/react-providers";
import { SubmittableExtrinsic } from "@polkadot/api/types";

import { useSettingsProvider } from "../providers/public/settings";
import { useNativeApi } from "../providers/public/nativeApi";
import { appsyncOrderbookService } from "../utils/orderbookService";
import { useOrderbookService } from "../providers/public/orderbookServiceProvider/useOrderbookService";
import { handleTransaction } from "../helpers";

type DepositArgs = {
  amount: string | number;
  asset: Record<string, string | null>;
  account: ExtensionAccount;
  tokenFeeId?: string;
};

export const useDeposit = () => {
  const { onHandleError, onHandleInfo, onHandleAlert } = useSettingsProvider();
  const { api } = useNativeApi();
  const { isReady } = useOrderbookService();
  const { addToTxQueue } = useTransactionManager();

  const { mutateAsync, status } = useMutation({
    mutationFn: async ({ asset, amount, account, tokenFeeId }: DepositArgs) => {
      if (!isReady) throw new Error("Orderbook service not initialized");

      if (!api || !api?.isConnected)
        throw new Error("You are not connected to blockchain");

      if (account?.address?.trim().length === 0)
        throw new Error("Invalid account");

      onHandleInfo?.("Processing Deposit...");

      const signedExtrinsic = (await appsyncOrderbookService.operation.deposit({
        api,
        account,
        asset,
        amount,
        tokenFeeId,
      })) as SubmittableExtrinsic<"promise">;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      addToTxQueue(signedExtrinsic);
      await handleTransaction(signedExtrinsic);
    },

    onError: (error) => {
      const errorMessage =
        error instanceof Error ? error.message : String(error ?? "");
      onHandleError(errorMessage);
    },
    onSuccess: () =>
      onHandleAlert(
        "Congratulations! You have successfully deposited assets to your trading account."
      ),
  });

  return { mutateAsync, loading: status === "pending" };
};
