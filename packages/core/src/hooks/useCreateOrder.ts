import { signRawOrThrow } from "@orderbook/core/helpers/rawSigningPayload";
import { errorMessage } from "@orderbook/core/helpers/errorMessage";
import { useMutation } from "@tanstack/react-query";
import { useUserAccounts } from "@aksumite/react-providers";
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
import { localTradingPair } from "../helpers/localTradingPair";

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
        // rawSignerPayload, not a literal: the `type: "bytes"` field is
        // required and was missing here, which made EVERY order fail on
        // Enkrypt with "type is not bytes: signer_signRaw".
        const result = await signRawOrThrow(
          signer,
          mainAddress,
          JSON.stringify(signingPayload)
        );
        signature = { Sr25519: result.signature.slice(2) };
      } else {
        // `wallet.getPair` THROWS when the pair is absent - polkadot's keyring
        // raises "Unable to retrieve keypair '<address>'" - so the old
        // `if (!keyringPair)` below it was unreachable and that raw message
        // reached the user's toast. localTradingPair converts every failure
        // into something actionable, and separates "not in this browser" from
        // "locked", which have very different remedies.
        const lookup = localTradingPair(wallet, tradeAddress);
        if (!lookup.ok) throw new Error(lookup.message);

        signature = signPayload(api, lookup.pair, signingPayload as Codec);
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
    onError: (error: unknown) =>
      // `unknown`, not `Error`: react-query hands over whatever was thrown, and
      // an injected wallet signer throws plain objects. The old `error.message`
      // was undefined for those, so the real cause reached Sentry and the user
      // got "Something went wrong" (ORDERBOOK-TESTNET-N).
      onHandleError?.(errorMessage(error) || "Something went wrong"),
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
