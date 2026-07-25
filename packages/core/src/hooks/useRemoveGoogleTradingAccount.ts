import { UseQueryResult, useMutation } from "@tanstack/react-query";
import { GDriveExternalAccountStore } from "@mitra/local-wallets";
import { Dispatch, SetStateAction } from "react";

import { sleep } from "../helpers";
import { useSettingsProvider } from "../providers/public/settings";

export const useRemoveGoogleTradingAccount = ({
  GoogleDrive,
  gDriveReady,
  setGDriveReady,
  onRefetchGoogleDriveAccounts,
}: {
  GoogleDrive: GDriveExternalAccountStore;
  gDriveReady: boolean;
  setGDriveReady: Dispatch<SetStateAction<boolean>>;
  onRefetchGoogleDriveAccounts: UseQueryResult["refetch"];
}) => {
  const { onHandleError } = useSettingsProvider();
  return useMutation({
    mutationFn: async (value: string) => {
      if (!gDriveReady) {
        await GoogleDrive.init();
        setGDriveReady(true);
      }
      await GoogleDrive.remove(value);
      await sleep(2000);
      await onRefetchGoogleDriveAccounts();
    },
    onError: (error: { message: string }) =>
      onHandleError(error?.message ?? error),
  });
};
