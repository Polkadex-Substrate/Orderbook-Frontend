import { FC, PropsWithChildren } from "react";
import { ExtensionsArray } from "@polkadot-cloud/assets/extensions";
import type { Signer } from "@polkadot/types/types";

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
  /**
   * The extension's signer for this address, or undefined if it has none.
   *
   * WAS `=> any`, AND THAT ONE `any` COST ALL TRADING ON ENKRYPT. Four hooks
   * call `signer.signRaw({ address, data })`, omitting the `type` field that
   * `SignerPayloadRaw` requires. With `any` there was nothing to check it
   * against, so every one of them compiled. polkadot-js tolerates the omission;
   * Enkrypt rejects it with "type is not bytes: signer_signRaw", and no order
   * of any kind could be placed.
   *
   * Typed properly, the compiler enforces the payload shape at all four sites.
   * See helpers/rawSigningPayload.ts, which is what they should call.
   */
  getSigner: (address: string) => Signer | undefined;
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
