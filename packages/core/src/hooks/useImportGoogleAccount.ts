import { UseQueryResult, useMutation } from "@tanstack/react-query";
import { useUserAccounts } from "@mitra/react-providers";
import { KeyringPair } from "@polkadot/keyring/types";

import { sleep } from "../helpers";

export type ImportFromGoogleAccount = {
  account: KeyringPair;
  password: string;
};

export const useImportGoogleAccount = ({
  onRefetchGoogleDriveAccounts,
}: {
  onRefetchGoogleDriveAccounts: UseQueryResult["refetch"];
}) => {
  const { wallet } = useUserAccounts();

  const { mutateAsync, status, error, isPending, isSuccess } = useMutation({
    mutationFn: async ({ account, password }: ImportFromGoogleAccount) => {
      wallet.add(account, password);
      await sleep(2000);
      await onRefetchGoogleDriveAccounts();
    },
    onError: (e) => console.log("Error", e),
  });

  return {
    mutateAsync,
    status,
    error,
    isLoading: isPending,
    isSuccess,
  };
};
