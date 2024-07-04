import { MutateHookProps } from "@orderbook/core/hooks/types";
import { useNativeApi } from "@orderbook/core/providers/public/nativeApi";
import {
  ExtensionAccount,
  useTransactionManager,
  useUserAccounts,
} from "@polkadex/react-providers";
import { useProfile } from "@orderbook/core/providers/user/profile";
import { useMutation } from "@tanstack/react-query";
import { handleTransaction, removeFromStorage } from "@orderbook/core/helpers";
import { ACTIVE_ACCOUNT_KEY } from "@orderbook/core/providers/user/profile/constants";
import { KeyringPair } from "@polkadot/keyring/types";
import { SubmittableExtrinsic } from "@polkadot/api/promise/types";

import { appsyncOrderbookService } from "../utils/orderbookService";
import { NOTIFICATIONS } from "../constants";
import { useSettingsProvider } from "../providers/public/settings";

export type RemoveProxyAccountArgs = {
  proxy: string;
  tokenFeeId?: string;
  selectedWallet?: ExtensionAccount;
};

interface RemoveProxyAccount extends MutateHookProps {
  onRemoveGoogleDrive: (value: string) => Promise<void>;
  googleDriveAccounts: KeyringPair[];
}
export function useRemoveProxyAccount({
  onRemoveGoogleDrive,
  googleDriveAccounts,
  onError,
  onSuccess,
}: RemoveProxyAccount) {
  const { api } = useNativeApi();
  const { wallet, localAddresses } = useUserAccounts();
  const { selectedAddresses, onUserLogout } = useProfile();
  const { onPushNotification } = useSettingsProvider();
  const { addToTxQueue } = useTransactionManager();

  const { mutateAsync, status, error } = useMutation({
    mutationFn: async ({
      proxy,
      tokenFeeId,
      selectedWallet,
    }: RemoveProxyAccountArgs) => {
      if (!api || !wallet)
        throw new Error("You are not connected to blockchain ");

      if (!selectedWallet) throw new Error("seletedWallet is not defined");

      const signedExtrinsic =
        (await appsyncOrderbookService.operation.removeAccount({
          api,
          account: selectedWallet,
          proxyAddress: proxy,
          tokenFeeId,
        })) as SubmittableExtrinsic;
      addToTxQueue(signedExtrinsic);
      await handleTransaction(signedExtrinsic);

      // TODO: Temp solution, backend issue. Remove it when it resolved in backend
      await isTradingAccountRemovedFromDb(proxy, selectedWallet.address);

      if (proxy === selectedAddresses.tradeAddress) {
        onUserLogout();
        removeFromStorage(ACTIVE_ACCOUNT_KEY);
      }
      const isGDriveStored = googleDriveAccounts?.some((e) =>
        e.address.includes(proxy)
      );
      const isLocalStored = localAddresses.includes(proxy);
      if (isGDriveStored) await onRemoveGoogleDrive(proxy);
      if (isLocalStored) wallet.remove(proxy);
    },
    onError: (error) => onError?.(error as Error),
    onSuccess: () => {
      onSuccess?.("Trading account removed from blockchain");
      onPushNotification(NOTIFICATIONS.removeTradingAccount());
    },
  });

  return {
    mutateAsync,
    status,
    error,
  };
}

const isTradingAccountRemovedFromDb = async (
  tradeAddress: string,
  mainAddress: string
) => {
  const maxAttempts = 15;

  // TODO: Temp solution, backend issue
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const proxies =
        await appsyncOrderbookService.query.getTradingAddresses(mainAddress);
      if (!proxies.includes(tradeAddress)) {
        break;
      }
      throw new Error("Proxy not removed yet from database");
    } catch (error: unknown) {
      console.error(
        `Attempt ${attempt + 1} failed: ${(error as Error).message}`
      );
    }
    if (attempt < maxAttempts)
      await new Promise((resolve) => setTimeout(resolve, 10000));
  }
};
