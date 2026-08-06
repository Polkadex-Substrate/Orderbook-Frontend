import { FC, PropsWithChildren } from "react";
import { ApiPromise } from "@polkadot/api";
import { LmpApi, SwapApi } from "@polkadex/polkadex-api";

export interface NativeApiState {
  connected: boolean;
  connecting: boolean;
  timestamp?: number;
  hasExtension?: boolean;
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
