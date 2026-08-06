/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable spaced-comment */
import { useEffect, useReducer, useState } from "react";
import { ApiPromise } from "@polkadot/api";
import { defaultConfig } from "@orderbook/core/config";
// `statics` is no longer imported here. Reading that mutable global was the bug:
// see the note in statics.ts. createApi now returns the instance and binds the
// listeners itself.
import { createApi } from "@orderbook/core/providers/public/nativeApi/statics";
// TODO: wrong @polkadex/polkadex-api polkadot api version
import { LmpApi, SwapApi } from "@aksumite/chain-api";

import { Provider } from "./context";
import { nativeApiReducer, initialState } from "./reducer";
import * as T from "./types";
import * as A from "./actions";

export const NativeApiProvider: T.NativeApiComponent = ({ children }) => {
  const [state, dispatch] = useReducer(nativeApiReducer, initialState);
  const [lmp, setLmp] = useState<LmpApi>();
  const [swap, setSwap] = useState<SwapApi>();

  const shouldRangerConnect =
    !state.timestamp && !state.connected && !state.api;

  useEffect(() => {
    const onReady = (api: ApiPromise) => {
      //@ts-ignore
      const lmp = new LmpApi(api);
      //@ts-ignore
      const swap = new SwapApi(api);
      setLmp(lmp);
      setSwap(swap);
      dispatch(A.nativeApiConnectData(api));
    };
    const onConnectError = () => {
      dispatch(A.nativeApiConnectError());
    };
    /*
     * Catch the bootstrap failure that never reaches us as a rejected promise.
     *
     * Sentry JAVASCRIPT-NEXTJS-4:
     *   Error: FATAL: Unable to initialize the API: No response received from RPC
     *   endpoint in 60s
     *   at __internal__onProviderConnect
     *   mechanism: onunhandledrejection, handled: no
     *
     * @polkadot/api builds that message in Init.js's catch block and then emits
     * 'error', which the listener below handles. But something on that path also
     * leaves a rejected promise nobody owns - `provider.on('connected', () =>
     * this.__internal__onProviderConnect())` attaches no .catch, unlike the
     * manual call a few lines above it. We hold no reference to that promise, so
     * there is nothing to .catch(); a window-level listener is the only handle.
     *
     * Deliberately NOT calling event.preventDefault(): a dead RPC endpoint is
     * something we want to keep seeing in Sentry. The point of this handler is
     * that the UI now reacts - dispatching connect-error instead of leaving the
     * user on a silently dead page.
     *
     * Matched on message text because the error carries no code or type. Narrow
     * enough not to swallow unrelated rejections.
     */
    const RPC_BOOTSTRAP_FAILURE =
      /Unable to initialize the API|No response received from RPC endpoint/i;

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason as { message?: string } | string | undefined;
      const message =
        typeof reason === "string" ? reason : (reason?.message ?? "");

      if (RPC_BOOTSTRAP_FAILURE.test(message)) {
        console.error("[api provider] RPC bootstrap failed:", message);
        onConnectError();
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("unhandledrejection", onUnhandledRejection);
    }

    if (shouldRangerConnect) {
      createApi(defaultConfig.polkadexChain, {
        // Attached synchronously inside createApi, against the instance it
        // created - see the note there on why .then() was wrong.
        onReady: (api) => onReady(api),
        onError: (error) => {
          console.error("[api provider]", error);
          onConnectError();
        },
        onDisconnected: () =>
          // Not an error: WsProvider auto-reconnects on RECONNECT_TIME_MS and
          // will emit 'ready' again. Logged only, so a blip does not tear down
          // a session that is about to recover.
          console.warn("[api provider] disconnected, awaiting reconnect"),
      }).catch((e) => {
        console.error("[api provider]", e);
        onConnectError();
      });
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("unhandledrejection", onUnhandledRejection);
      }
    };
  }, [shouldRangerConnect, dispatch]);

  return (
    <Provider
      value={{
        ...state,
        lmp,
        swap,
      }}
    >
      {children}
    </Provider>
  );
};
