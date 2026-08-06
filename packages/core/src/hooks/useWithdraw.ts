import { useMutation } from "@tanstack/react-query";
import { useNativeApi } from "@orderbook/core/providers/public//nativeApi";
import { useSettingsProvider } from "@orderbook/core/providers/public/settings";
import { useProfile } from "@orderbook/core/providers/user/profile";
import {
  createWithdrawSigningPayload,
  signPayload,
  isValidAddress,
} from "@orderbook/core/helpers";
import { useUserAccounts } from "@polkadex/react-providers";
import { KeyringPair } from "@polkadot/keyring/types";
import { Codec } from "@polkadot/types/types";

import { appsyncOrderbookService } from "../utils/orderbookService";

type WithdrawArgs = {
  asset: string;
  amount: string | number;
};

export const useWithdraw = () => {
  const {
    selectedAddresses: { mainAddress, tradeAddress },
    getSigner,
  } = useProfile();
  const { api } = useNativeApi();
  const { onHandleAlert, onHandleError } = useSettingsProvider();
  const { wallet } = useUserAccounts();

  const { mutateAsync, status } = useMutation({
    mutationFn: async ({ asset, amount }: WithdrawArgs) => {
      if (!api || !api?.isConnected)
        throw new Error("You are not connected to blockchain");

      // Check if the withdrawal needs to be signed by the extension
      const isSignedByExtension =
        tradeAddress?.trim().length === 0 || mainAddress === tradeAddress;

      const signingPayload = createWithdrawSigningPayload(
        {
          asset,
          amount,
        },
        api,
        isSignedByExtension
      );

      let signature: { Sr25519: string };

      if (isSignedByExtension) {
        const signer = getSigner(mainAddress);
        if (!signer) throw new Error("No signer for main account found");

        const result = await signer.signRaw({
          data: JSON.stringify(signingPayload),
          address: mainAddress,
        });
        signature = { Sr25519: result.signature.slice(2) };
      } else {
        const keyringPair = wallet.getPair(tradeAddress);

        if (!isValidAddress(tradeAddress) || !keyringPair)
          throw new Error("Invalid trading account");

        if (keyringPair?.isLocked)
          throw new Error("Please unlock your account first");

        signature = signPayload(
          api,
          keyringPair as KeyringPair,
          api.createType("WithdrawPayload", signingPayload) as Codec
        );
      }
      const proxy = isSignedByExtension ? mainAddress : tradeAddress;
      await appsyncOrderbookService.operation.withdraw({
        address: proxy,
        payload: [
          mainAddress,
          proxy,
          { ...signingPayload, asset_id: { asset } },
          signature,
        ],
      });
    },
    onError: (error) => {
      const errorMessage = (error as Error).message ?? (error as string);
      onHandleError(errorMessage);
    },
    onSuccess: () =>
      onHandleAlert(
        "Your withdrawal is being processed and will be credited in a few minutes"
      ),
  });

  return { mutateAsync, loading: status === "loading" };
};
