import { signRawOrThrow } from "@orderbook/core/helpers/rawSigningPayload";
import { errorMessage } from "@orderbook/core/helpers/errorMessage";
import { useMutation } from "@tanstack/react-query";
import { useUserAccounts } from "@aksumite/react-providers";
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
import { localTradingPair } from "../helpers/localTradingPair";

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
        const result = await signRawOrThrow(signer, mainAddress, market);
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
    onError: (error: unknown) =>
      // `unknown`, not `Error`: react-query hands over whatever was thrown, and
      // an injected wallet signer throws plain objects. The old `error.message`
      // was undefined for those, so the real cause reached Sentry and the user
      // got "Something went wrong" (ORDERBOOK-TESTNET-N).
      onHandleError?.(errorMessage(error) || "Something went wrong"),
    onSuccess: () => onHandleAlert(`Orders cancelled`),
  });
};
