import { useMutation } from "@tanstack/react-query";
import { useUserAccounts } from "@polkadex/react-providers";
import {
  createOrderPayload,
  createOrderSigningPayload,
  formatNumber,
  isValidAddress,
  signPayload,
} from "@orderbook/core/helpers";
import { Codec } from "@polkadot/types/types";

import {
  OrderSide,
  OrderType,
  Market,
  appsyncOrderbookService,
} from "../utils/orderbookService";
import { useSettingsProvider } from "../providers/public/settings";
import { useProfile } from "../providers/user/profile";
import { useNativeApi } from "../providers/public/nativeApi";
import { NOTIFICATIONS } from "../constants";

type CreateOrderArgs = {
  symbol: string[];
  side: OrderSide;
  price: string;
  orderType: OrderType;
  amount: number;
  market: Market;
};

export const useCreateOrder = () => {
  const { wallet } = useUserAccounts();
  const { onHandleError, onHandleAlert, onPushNotification } =
    useSettingsProvider();
  const {
    selectedAddresses: { mainAddress, tradeAddress },
    getSigner,
  } = useProfile();
  const { api } = useNativeApi();

  return useMutation({
    mutationFn: async (args: CreateOrderArgs) => {
      const { symbol, side, price, orderType, amount } = args;
      if (!api?.isConnected)
        throw new Error("You are not connected to blockchain");

      if (!isValidAddress(tradeAddress))
        throw new Error("Invalid trading account");

      const order = createOrderPayload({
        tradeAddress,
        type: orderType,
        side,
        baseAsset: symbol[0],
        quoteAsset: symbol[1],
        quantity: formatNumber(String(amount)),
        price: formatNumber(price),
        mainAddress,
      });

      // Check if the order needs to be signed by the extension
      const isSignedByExtension = tradeAddress === mainAddress;
      const signingPayload = createOrderSigningPayload(
        order,
        api,
        isSignedByExtension
      );
      let signature: { Sr25519: string };
      if (isSignedByExtension) {
        const signer = getSigner(mainAddress);
        if (!signer) throw new Error("No signer for main account found");
        const result = await signer.signRaw({
          address: mainAddress,
          data: JSON.stringify(signingPayload),
        });
        signature = { Sr25519: result.signature.slice(2) };
      } else {
        const keyringPair = wallet.getPair(tradeAddress);
        if (!keyringPair) throw new Error("Invalid trading account");

        if (keyringPair?.isLocked)
          throw new Error("Please unlock your account first");

        signature = signPayload(api, keyringPair, signingPayload as Codec);
      }
      const payload = JSON.stringify({
        PlaceOrder: [signingPayload, signature],
      });
      await appsyncOrderbookService.operation.placeOrder({
        payload,
        token: tradeAddress,
      });

      return args;
    },
    onError: (error: Error) => onHandleError?.(error.message),
    onSuccess: (order: CreateOrderArgs) => {
      const { side, orderType, amount, market } = order;
      onHandleAlert("Order placed");
      onPushNotification(
        NOTIFICATIONS.placeOrder(
          side,
          orderType,
          amount,
          market.baseAsset.ticker,
          market.quoteAsset.ticker
        )
      );
    },
  });
};
