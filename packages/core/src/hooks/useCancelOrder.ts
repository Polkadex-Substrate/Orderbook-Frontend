import { useMutation } from "@tanstack/react-query";
import { useUserAccounts } from "@polkadex/react-providers";
import {
  isAssetPDEX,
  isValidAddress,
  signPayload,
} from "@orderbook/core/helpers";

import { appsyncOrderbookService } from "../utils/orderbookService";
import { useSettingsProvider } from "../providers/public/settings";
import { useProfile } from "../providers/user/profile";
import { useNativeApi } from "../providers/public/nativeApi";

export type CancelOrderArgs = {
  orderId: string;
  base: string;
  quote: string;
};

export const useCancelOrder = () => {
  const { wallet } = useUserAccounts();
  const { onHandleError, onHandleAlert, onHandleInfo } = useSettingsProvider();
  const {
    selectedAddresses: { mainAddress, tradeAddress },
    getSigner,
  } = useProfile();
  const { api } = useNativeApi();

  return useMutation({
    mutationFn: async ({ orderId, base, quote }: CancelOrderArgs) => {
      if (!api?.isConnected)
        throw new Error("You are not connected to blockchain");

      onHandleInfo?.("Cancelling order...");

      const baseAsset = isAssetPDEX(base) ? "PDEX" : base;
      const quoteAsset = isAssetPDEX(quote) ? "PDEX" : quote;
      const pair = `${baseAsset}-${quoteAsset}`;

      // Check if the order needs to be cancelled by the extension
      const isSignedByExtension =
        tradeAddress?.trim().length === 0 || mainAddress === tradeAddress;

      let signature: { Sr25519: string };
      if (isSignedByExtension) {
        const signer = getSigner(mainAddress);
        if (!signer) throw new Error("No signer for main account found");
        const result = await signer.signRaw({
          address: mainAddress,
          data: orderId.slice(2),
        });
        signature = { Sr25519: result?.signature.slice(2) };
      } else {
        if (!isValidAddress(tradeAddress))
          throw new Error("Invalid trading account");

        const keyringPair = wallet.getPair(tradeAddress);

        if (!keyringPair) throw new Error("Invalid trading account");

        if (keyringPair?.isLocked)
          throw new Error("Please unlock your account first");

        signature = signPayload(
          api,
          keyringPair,
          api.createType("order_id", orderId)
        );
      }

      const payload = JSON.stringify({
        CancelOrder: [orderId, mainAddress, tradeAddress, pair, signature],
      });

      await appsyncOrderbookService.operation.cancelOrder({
        payload,
        token: tradeAddress,
      });

      return orderId;
    },
    onError: (error: Error) => onHandleError?.(error.message),
    onSuccess: (e) => onHandleAlert(`Order cancelled: ${e}`),
  });
};
