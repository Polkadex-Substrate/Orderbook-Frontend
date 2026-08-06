import { FC, PropsWithChildren } from "react";
import { ExtensionAccount } from "@polkadex/react-providers";

import { WithdrawsClaimFetch } from "./actions";

export interface WithdrawsState {
  error?: string;
  loading: boolean;
  success: boolean;
  claimLoading: boolean;
  claimsInLoading: Array<number>;
  claimSuccess: boolean;
}

export type WithdrawsContextProps = WithdrawsState & {
  onFetchClaimWithdraw: (value: OnFetchClaimWithdraw) => Promise<void>;
};

export type WithdrawsProviderProps = PropsWithChildren<{
  value: WithdrawsContextProps;
}>;

export interface WithdrawsProps {
  onError?: (value: string) => void;
  onNotification?: (value: string) => void;
}

export type OnFetchClaimWithdraw = WithdrawsClaimFetch["payload"] & {
  selectedWallet?: ExtensionAccount;
};
export type WithdrawsComponent = FC<PropsWithChildren<WithdrawsProps>>;
