// TODO: Move this to packages/core/hooks
import { useMutation } from "@tanstack/react-query";
import { useSettingsProvider } from "@orderbook/core/providers/public/settings";
import { NOTIFICATIONS } from "@orderbook/core/constants";
import { Chain } from "@polkadex/thea";
import { useDirectWithdrawProvider } from "@orderbook/core/providers/user/sendAndReceive";
import { useNativeApi } from "@orderbook/core/providers/public/nativeApi";
import { useOrderbookService } from "@orderbook/core/providers/public/orderbookServiceProvider/useOrderbookService";
import { KeyringPair } from "@polkadot/keyring/types";
import { Codec } from "@polkadot/types/types";
import { useUserAccounts } from "@polkadex/react-providers";
import { appsyncOrderbookService } from "@orderbook/core/utils/orderbookService";
import {
  createDirectWithdrawSigningPayload,
  isValidAddress,
  signPayload,
  sleep,
} from "@orderbook/core/helpers";
import { useProfile } from "@orderbook/core/providers/user/profile";

export function useWithdraw({ onSuccess }: { onSuccess: () => void }) {
  const { onHandleAlert, onHandleError, onPushNotification, onHandleInfo } =
    useSettingsProvider();
  const {
    destinationChain,
    sourceAccount,
    selectedAsset,
    destinationAccount,
    isDestinationPolkadex,
    destinationConnector,
    transferConfig,
  } = useDirectWithdrawProvider();
  const { wallet } = useUserAccounts();
  const { api } = useNativeApi();
  const { isReady } = useOrderbookService();
  const {
    selectedAddresses: { mainAddress, tradeAddress },
    getSigner,
  } = useProfile();

  return useMutation({
    mutationFn: async ({ amount }: { amount: string | number }) => {
      // When Destination is Polkadex - Logic for transfer from trading to funding
      if (!isReady) throw new Error("Orderbook service not initialized");

      if (!api || !api?.isConnected)
        throw new Error("You are not connected to blockchain");

      if (!sourceAccount || !destinationAccount || !destinationChain) {
        throw new Error("Withdraw issue");
      }

      onHandleInfo?.("Processing Withdraw...");

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

      if (
        !isDestinationPolkadex &&
        transferConfig &&
        selectedAsset?.ticker !==
          transferConfig?.destinationNativeExistential.ticker // Ensure it's a non-native asset for destination chain
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

      const asset = selectedAsset?.id || "PDEX";

      // Check if the withdrawal needs to be signed by the extension
      const isSignedByExtension =
        tradeAddress?.trim().length === 0 || mainAddress === tradeAddress;

      const [signingPayload, sendingPayload] =
        createDirectWithdrawSigningPayload(
          api,
          {
            asset,
            amount,
          },
          isSignedByExtension,
          destinationAccount.address,
          destinationChain
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
          { ...sendingPayload, asset_id: { asset } },
          signature,
        ],
      });

      await sleep(4000);
      onSuccess();
      onHandleAlert(
        "Withdraw Success. Expect tokens in the destination chain in a few minutes"
      );

      return amount;
    },
    onError: (error: Error) => onHandleError?.(error.message),
    onSuccess: (amount: number) =>
      onPushNotification(
        NOTIFICATIONS.directWithdraw({
          destinationChain: destinationChain as Chain,
          asset: selectedAsset?.ticker as string,
          amount,
        })
      ),
  });
}
