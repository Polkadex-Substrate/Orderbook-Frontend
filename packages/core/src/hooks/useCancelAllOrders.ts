import { useMutation } from "@tanstack/react-query";
import { useUserAccounts } from "@polkadex/react-providers";
import {
  createCancelAllPayload,
  isValidAddress,
  signPayload,
} from "@orderbook/core/helpers";
import { Codec } from "@polkadot/types/types";

import { appsyncOrderbookService } from "../utils/orderbookService";
import { useSettingsProvider } from "../providers/public/settings";
import { useProfile } from "../providers/user/profile";
import { useNativeApi } from "../providers/public/nativeApi";

export const useCancelAllOrders = () => {
  const { wallet } = useUserAccounts();
  const { onHandleError, onHandleAlert, onHandleInfo } = useSettingsProvider();
  const {
    selectedAddresses: { mainAddress, tradeAddress },
    getSigner,
  } = useProfile();
  const { api } = useNativeApi();

  return useMutation({
    mutationFn: async ({ market }: { market: string }) => {
      if (!api?.isConnected)
        throw new Error("You are not connected to blockchain");

      onHandleInfo?.("Cancelling orders...");

      // Check if the orders needs to be cancelled by the extension
      const isSignedByExtension =
        tradeAddress?.trim().length === 0 || mainAddress === tradeAddress;

      const signingPayload = createCancelAllPayload(
        api,
        market,
        mainAddress,
        tradeAddress,
        isSignedByExtension
      );

      let signature: { Sr25519: string };

      if (isSignedByExtension) {
        const signer = getSigner(mainAddress);
        if (!signer) throw new Error("No signer for main account found");
        const result = await signer.signRaw({
          address: mainAddress,
          data: market,
        });
        signature = { Sr25519: result?.signature.slice(2) };
      } else {
        const keyringPair = wallet.getPair(tradeAddress);

        if (!isValidAddress(tradeAddress) || !keyringPair)
          throw new Error("Invalid trading account");

        if (keyringPair?.isLocked)
          throw new Error("Please unlock your account first");

        signature = signPayload(api, keyringPair, signingPayload as Codec);
      }

      const payload = JSON.stringify({
        CancelAll: [signingPayload, signature],
      });
      await appsyncOrderbookService.operation.cancelAll({
        payload,
        token: tradeAddress,
      });
    },
    onError: (error: Error) => onHandleError?.(error.message),
    onSuccess: () => onHandleAlert(`Orders cancelled`),
  });
};
