import { useMutation } from "@tanstack/react-query";
import { useUserAccounts } from "@polkadex/react-providers";

import { useProfile } from "../providers/user/profile";
import { appsyncOrderbookService } from "../utils/orderbookService";

import { MutateHookProps } from "./types";

export type ImportFromMnemonic = {
  mnemonic: string;
  name: string;
  password: string;
};

export const useImportProxyAccountMnemonic = (props: MutateHookProps) => {
  const { wallet, isReady } = useUserAccounts();
  const { onUserSelectTradingAddress } = useProfile();

  const { mutateAsync, status, error } = useMutation({
    mutationFn: async ({ mnemonic, name, password }: ImportFromMnemonic) => {
      if (!isReady) throw new Error("Can't import before initialization.");

      const { pair } = wallet.addFromMnemonic(mnemonic, name, password);

      const isValidPair = await appsyncOrderbookService.query.getFundingAddress(
        pair.address
      );

      if (!isValidPair) {
        wallet.remove(pair.address);
        throw new Error("No funding account linked to this trade account.");
      }

      await onUserSelectTradingAddress({
        tradeAddress: pair.address,
        isNew: true,
      });
    },
    onError: (e) => console.log("Error", e),
    onSuccess: () =>
      props?.onSuccess?.("Trading account imported successfully"),
  });

  return {
    mutateAsync,
    status,
    error,
  };
};
