import { createContext } from "react";
import {
  ProfileContextInterface,
  ProfileProviderProps,
} from "@orderbook/core/providers/user/profile/types";

export const Context = createContext<ProfileContextInterface>({
  onUserSelectTradingAddress: async () => {},
  onUserLogout: () => {},
  onUserChangeInitBanner: () => {},
  onUserSetAvatar: () => {},
  onUserFavoriteMarketPush: () => {},
  getSigner: () => {},
  onUserSelectMainAddress: async () => {},
  onUserResetMainAddress: () => {},
  onUserResetTradingAddress: () => {},
  onResetSelectedExtension: () => {},
  setSelectedExtension: () => {},
  onSetPrice: () => {},
  onSetAmount: () => {},
  onSetTotal: () => {},
  allAccounts: [],
  avatar: "",
  favoriteMarkets: [],
  isBannerShown: false,
  selectedAddresses: { mainAddress: "", tradeAddress: "" },
  selectedExtension: null,
  price: "",
  amount: "",
  total: "",
});

export const Provider = ({ value, children }: ProfileProviderProps) => {
  return <Context.Provider value={value}>{children}</Context.Provider>;
};
