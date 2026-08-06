import { ApiPromise, WsProvider } from "@polkadot/api";
import { RECONNECT_TIME_MS } from "@orderbook/core/providers/public/nativeApi/constants";
import { apiTypes } from "@aksumite/chain-api";
import { apiOptions } from "@aksumite/blockchain-api";

export interface Statics {
  api: ApiPromise;
}

export const statics: Statics = {
  api: undefined as unknown as ApiPromise,
};
const { runtime, rpc, types } = apiOptions;

export type ApiHandlers = {
  onReady?: (api: ApiPromise) => void;
  onError?: (error: unknown) => void;
  onDisconnected?: () => void;
};

/**
 * Creates the chain API and attaches listeners SYNCHRONOUSLY, in the same tick as
 * construction.
 *
 * Why that matters: the caller used to do
 *
 *   createApi(url).then(() => { statics.api.on("ready", ...); statics.api.on("error", ...) })
 *
 * which has two defects.
 *
 * 1. It reads the MUTABLE GLOBAL `statics.api` inside the callback rather than the
 *    instance it just created. If createApi runs twice - a re-run of the effect,
 *    React StrictMode's double-invoke, a reconnect - the first callback attaches
 *    its listeners to the SECOND instance, and the first instance is left with no
 *    'error' listener at all. Its failures then go nowhere.
 * 2. Even in the single-instance case the listeners land a microtask late, so any
 *    event emitted during construction is missed.
 *
 * Returning the instance lets callers stop touching the global entirely.
 */
export async function createApi(
  apiUrl: string[],
  handlers: ApiHandlers = {}
): Promise<ApiPromise> {
  const provider = new WsProvider(apiUrl, RECONNECT_TIME_MS);
  const api = new ApiPromise({
    provider,
    runtime: { ...runtime, ...apiTypes.runtime },
    types: { ...types, ...apiTypes.types },
    rpc: { ...rpc, ...apiTypes.rpc },
    signedExtensions: {
      ChargeAssetTxPayment: {
        extrinsic: {
          tip: "Compact<u128>",
          assetId: "Option<FrameSupportTokensFungibleUnionOfNativeOrWithId>",
        },
        payload: {},
      },
      WeightReclaim: {
        extrinsic: {},
        payload: {},
      },
    },
  });

  // Before the global is reassigned and before any await, so no event can be
  // missed and the handlers are bound to THIS api, not to whatever statics.api
  // happens to hold later.
  if (handlers.onReady) api.on("ready", () => handlers.onReady?.(api));
  if (handlers.onError) api.on("error", (error) => handlers.onError?.(error));
  if (handlers.onDisconnected) api.on("disconnected", handlers.onDisconnected);

  statics.api = api;
  return api;
}
