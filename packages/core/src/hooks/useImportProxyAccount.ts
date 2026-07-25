import { useMutation } from "@tanstack/react-query";
import { useUserAccounts } from "@aksumite/react-providers";
import {
  EncryptedJsonEncoding,
  EncryptedJsonVersion,
} from "@polkadot/util-crypto/types";

import { useProfile } from "../providers/user/profile";

import { MutateHookProps } from "./types";

export interface DecodedFile {
  encoded: string;
  encoding: {
    content: string[];
    type: EncryptedJsonEncoding | EncryptedJsonEncoding[];
    version: EncryptedJsonVersion;
  };
  address: string;
  meta: {
    name: string;
    whenCreated: number;
  };
}

export type ImportFromFile = {
  file: DecodedFile;
  password: string;
};
export const useImportProxyAccount = (props: MutateHookProps) => {
  const { wallet } = useUserAccounts();
  const { onUserSelectTradingAddress } = useProfile();

  const { mutateAsync, status, error } = useMutation({
    mutationFn: async ({ file, password }: ImportFromFile) => {
      const pair = wallet.import(file, password);
      await onUserSelectTradingAddress({
        tradeAddress: pair.address,
        isNew: true,
      });
      props?.onSuccess?.("Trading account imported successfully");
    },
    onError: (e) => console.log("Error", e),
  });

  return {
    mutateAsync,
    status,
    error,
  };
};
