import { signRawOrThrow } from "@orderbook/core/helpers/rawSigningPayload";
import { errorMessage } from "@orderbook/core/helpers/errorMessage";
import { useMutation } from "@tanstack/react-query";
import { useUserAccounts } from "@aksumite/react-providers";
import {
  isAssetPDEX,
  isValidAddress,
  signPayload,
} from "@orderbook/core/helpers";

import { appsyncOrderbookService } from "../utils/orderbookService";
import { useSettingsProvider } from "../providers/public/settings";
import { useProfile } from "../providers/user/profile";
import { useNativeApi } from "../providers/public/nativeApi";
import { localTradingPair } from "../helpers/localTradingPair";

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
        const result = await signRawOrThrow(
          signer,
          mainAddress,
          orderId.slice(2)
        );
        signature = { Sr25519: result?.signature.slice(2) };
      } else {
        if (!isValidAddress(tradeAddress))
          throw new Error("Invalid trading account");

        // See localTradingPair: getPair throws rather than returning
        // undefined, so the check this replaces could never run.
        const lookup = localTradingPair(wallet, tradeAddress);
        if (!lookup.ok) throw new Error(lookup.message);
        const keyringPair = lookup.pair;

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
    onError: (error: unknown) =>
      // `unknown`, not `Error`: react-query hands over whatever was thrown, and
      // an injected wallet signer throws plain objects. The old `error.message`
      // was undefined for those, so the real cause reached Sentry and the user
      // got "Something went wrong" (ORDERBOOK-TESTNET-N).
      onHandleError?.(errorMessage(error) || "Something went wrong"),
    onSuccess: (e) => onHandleAlert(`Order cancelled: ${e}`),
  });
};
