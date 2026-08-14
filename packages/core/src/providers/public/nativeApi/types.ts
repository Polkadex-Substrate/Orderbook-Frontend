import { FC, PropsWithChildren } from "react";
import { ApiPromise } from "@polkadot/api";
import { LmpApi, SwapApi } from "@aksumite/chain-api";

export interface NativeApiState {
  connected: boolean;
  connecting: boolean;
  timestamp?: number;
  // `hasExtension` was removed. It was set false when the RPC failed, which is
  // an unrelated fact, and nothing ever read it. The extension flag in use is
  // the one on the settings provider.
  api?: ApiPromise;
  lmp?: LmpApi;
  swap?: SwapApi;
}

export type NativeApiProps = {
  onError?: (value: string) => void;
  onNotification?: (value: string) => void;
};

export type NativeApiProviderProps = PropsWithChildren<{
  value: NativeApiContextProps;
}>;

export type NativeApiContextProps = NativeApiState;

export type NativeApiComponent = FC<PropsWithChildren<NativeApiProps>>;
