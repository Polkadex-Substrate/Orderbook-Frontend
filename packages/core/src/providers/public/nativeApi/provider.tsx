/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable spaced-comment */
import { useEffect, useReducer, useState } from "react";
import { ApiPromise } from "@polkadot/api";
import { defaultConfig } from "@orderbook/core/config";
import {
  createApi,
  statics,
} from "@orderbook/core/providers/public/nativeApi/statics";
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
    if (shouldRangerConnect) {
      createApi(defaultConfig.polkadexChain)
        .then(() => {
          statics.api.on("ready", () => onReady(statics.api));
          statics.api.on("error", () => onConnectError());
        })
        .catch((e) => {
          console.error("[api provider]", e);
          onConnectError();
        });
    }
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
