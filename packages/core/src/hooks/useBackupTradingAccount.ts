import { UseQueryResult, useMutation } from "@tanstack/react-query";
import { KeyringPair } from "@polkadot/keyring/types";
import { GDriveExternalAccountStore } from "@aksumite/local-wallets";
import { Dispatch, SetStateAction } from "react";

import { sleep } from "../helpers";
import { useSettingsProvider } from "../providers/public/settings";

export type ExportTradeAccountProps = {
  account: KeyringPair;
  password?: string;
};

export const useBackupTradingAccount = ({
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
    mutationFn: async ({
      account: tradeAccount,
      password,
    }: ExportTradeAccountProps) => {
      tradeAccount.isLocked && tradeAccount.unlock(password);
      const jsonAccount = tradeAccount.toJson(password);
      if (!gDriveReady) {
        await GoogleDrive.init();
        setGDriveReady(true);
      }
      await GoogleDrive.addFromJson(jsonAccount);
      await sleep(2000);
      await onRefetchGoogleDriveAccounts();
    },
    onError: (error: { message: string }) =>
      onHandleError(error?.message ?? error),
  });
};
