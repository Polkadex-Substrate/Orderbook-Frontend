import { ApiPromise } from "@polkadot/api";
import { Codec } from "@polkadot/types/types";
import { getNonce } from "@orderbook/core/helpers/getNonce";
import { encodeAddress } from "@polkadot/util-crypto";
import { getNewClientId } from "@orderbook/core/helpers/getNewClientId";
import { SS58_DEFAULT_FORMAT } from "@orderbook/core/constants";

import { OrderSide, OrderType, OrderTypeEnum } from "../utils/orderbookService";

import { isAssetPDEX } from "./isAssetPDEX";

type OrderPayload = {
  tradeAddress: string;
  type: OrderType;
  side: OrderSide;
  baseAsset: string | null;
  quoteAsset: string | null;
  quantity: number | string;
  price: number | string;
  mainAddress: string;
};
export const createOrderPayload = ({
  tradeAddress,
  type,
  side,
  baseAsset,
  quoteAsset,
  quantity,
  price,
  mainAddress,
}: OrderPayload) => {
  const baseAssetId = !isAssetPDEX(baseAsset) ? baseAsset : "PDEX";
  const quoteAssetId = !isAssetPDEX(quoteAsset) ? quoteAsset : "PDEX";
  const orderType = { [type.toUpperCase()]: null };
  const orderSide = {
    [side]: null,
  };
  const isMarketBid = type === OrderTypeEnum.MARKET && side === "Bid";
  const ZERO = "0"; // for signature verification you have to specify like this.
  return {
    user: tradeAddress,
    /// convert to default ss58 format
    main_account: mainAddress,
    pair: baseAssetId + "-" + quoteAssetId,
    side: orderSide,
    order_type: orderType,
    qty: isMarketBid ? ZERO : quantity.toString(),
    quote_order_quantity: isMarketBid ? quantity.toString() : ZERO,
    price: type === OrderTypeEnum.LIMIT ? price.toString() : ZERO,
    timestamp: getNonce(),
    client_order_id: getNewClientId(),
  };
};

export const createOrderSigningPayload = (
  order: object,
  api: ApiPromise,
  isSignedByExtension = false
): Codec | object => {
  const codec = api.createType("OrderPayload", order);
  if (isSignedByExtension) {
    const payload = codec.toJSON() as unknown as ReturnType<
      typeof createOrderPayload
    >;
    payload.main_account = encodeAddress(
      payload.main_account,
      SS58_DEFAULT_FORMAT
    );
    payload.user = encodeAddress(payload.user, SS58_DEFAULT_FORMAT);
    return payload as object;
  }
  return codec as Codec;
};

export const createCancelAllPayload = (
  api: ApiPromise,
  market: string,
  mainAddress: string,
  tradeAddress: string,
  isSignedByExtension: boolean
) => {
  if (isSignedByExtension) {
    return {
      main: mainAddress,
      proxy: tradeAddress,
      market: market,
      timestamp: getNonce(),
    };
  }
  const signingPayload = api.createType("CancelAllPayload", {
    main: mainAddress,
    proxy: tradeAddress,
    market: market,
    timestamp: getNonce(),
  });
  return signingPayload;
};
