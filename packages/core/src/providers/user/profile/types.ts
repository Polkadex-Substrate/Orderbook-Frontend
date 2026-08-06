import { FC, PropsWithChildren } from "react";
import { ExtensionsArray } from "@polkadot-cloud/assets/extensions";

export interface UserAddressTuple {
  mainAddress: string; // the main address linked to the trade address
  tradeAddress: string;
}

export type ProfileContextState = {
  price: string;
  amount: string;
  total: string;
  selectedAddresses: UserAddressTuple;
  allAccounts: UserAddressTuple[];
  favoriteMarkets: string[];
  avatar: string | null;
  isBannerShown: boolean;
  selectedExtension: any | null;
};

export type ProfileContextInterface = ProfileContextState & {
  onSetPrice: (payload: string) => void;
  onSetAmount: (payload: string) => void;
  onSetTotal: (payload: string) => void;
  onUserSelectTradingAddress: (value: {
    tradeAddress: string;
    isNew?: boolean;
  }) => Promise<void>;
  onUserSelectMainAddress: (value: { mainAddress: string }) => Promise<void>;
  onUserLogout: () => void;
  onUserResetMainAddress: () => void;
  onUserResetTradingAddress: () => void;
  onResetSelectedExtension: () => void;
  onUserChangeInitBanner: (value?: boolean) => void;
  onUserSetAvatar: (value?: string) => void;
  onUserFavoriteMarketPush: (value: string) => void;
  getSigner: (address: string) => any;
  setSelectedExtension: (value: (typeof ExtensionsArray)[0]) => void;
};

export type ProfileProviderProps = PropsWithChildren<{
  value: ProfileContextInterface;
}>;

export interface ProfileProps {
  onError?: (value: string) => void;
  onNotification?: (value: string) => void;
}

export type ProfileComponent = FC<PropsWithChildren<ProfileProps>>;
