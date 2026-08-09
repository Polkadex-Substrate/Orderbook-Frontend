import { ApiPromise } from "@polkadot/api";
import { Codec } from "@polkadot/types/types";
import { getNonce } from "@orderbook/core/helpers/getNonce";
import { encodeAddress } from "@polkadot/util-crypto";
import { getNewClientId } from "@orderbook/core/helpers/getNewClientId";
import { SS58_DEFAULT_FORMAT } from "@orderbook/core/constants";

import {
  OrderSide,
  OrderType,
  OrderTypeEnum,
} from "../utils/orderbookService/types";

import { isAssetPDEX } from "./isAssetPDEX";

type OrderPayload = {
  tradeAddress: string;
  type: OrderType;
  side: OrderSide;
  baseAsset: string | null;
  quoteAsset: string | null;
  // Declared nullable because that is what actually arrives. See the guards in
  // the body: a MARKET order has no price, and the form can submit empty.
  quantity: number | string | null | undefined;
  price: number | string | null | undefined;
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
  // Refuse by NAME rather than by TypeError.
  //
  // These fields are declared non-nullable and arrive undefined anyway - the
  // form can submit before a price is set, and a MARKET order carries none at
  // all. `quantity.toString()` on undefined then threw "Cannot read properties
  // of undefined (reading 'toString')" from inside an async submit handler
  // (POLKADEX-ORDERBOOK-FE-TEST-9), which reached the user as nothing at all:
  // 29 unhandled rejections in three minutes while they retried.
  //
  // A named error is catchable, reportable and legible. A TypeError from a
  // helper is none of those.
  //
  // ORDER MATTERS: these run BEFORE any dereference. Placing them lower let
  // `type.toUpperCase()` throw first, which the test caught.
  if (!type) throw new Error("Cannot place an order without an order type");
  if (!side) throw new Error("Cannot place an order without a side");
  if (quantity === null || quantity === undefined || quantity === "")
    throw new Error("Cannot place an order without a quantity");
  if (
    type === OrderTypeEnum.LIMIT &&
    (price === null || price === undefined || price === "")
  )
    throw new Error("Cannot place a limit order without a price");

  const baseAssetId = !isAssetPDEX(baseAsset) ? baseAsset : "PDEX";
  const quoteAssetId = !isAssetPDEX(quoteAsset) ? quoteAsset : "PDEX";
  const orderType = { [type.toUpperCase()]: null };
  const orderSide = {
    [side]: null,
  };
  const isMarketBid = type === OrderTypeEnum.MARKET && side === "Bid";
  const ZERO = "0"; // for signature verification you have to specify like this.

  // Refuse by NAME rather than by TypeError.
  //
  // These fields are declared non-nullable and arrive undefined anyway - the
  // form can submit before a price is set, and a MARKET order carries none at
  // all. `quantity.toString()` on undefined then threw "Cannot read properties
  // of undefined (reading 'toString')" from inside an async submit handler
  // (POLKADEX-ORDERBOOK-FE-TEST-9), which reached the user as nothing at all:
  // 29 unhandled rejections in three minutes while they retried.
  //
  // A named error is catchable, reportable and legible. A TypeError from a
  // helper is none of those.
  if (quantity === null || quantity === undefined || quantity === "")
    throw new Error("Cannot place an order without a quantity");
  if (
    type === OrderTypeEnum.LIMIT &&
    (price === null || price === undefined || price === "")
  )
    throw new Error("Cannot place a limit order without a price");
  if (!type) throw new Error("Cannot place an order without an order type");
  if (!side) throw new Error("Cannot place an order without a side");
  return {
    user: tradeAddress,
    /// convert to default ss58 format
    main_account: mainAddress,
    pair: baseAssetId + "-" + quoteAssetId,
    side: orderSide,
    order_type: orderType,
    qty: isMarketBid ? ZERO : String(quantity),
    quote_order_quantity: isMarketBid ? String(quantity) : ZERO,
    // Guarded above: a LIMIT order without a price never reaches here.
    price: type === OrderTypeEnum.LIMIT ? String(price) : ZERO,
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
