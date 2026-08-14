import { UseQueryResult, useMutation } from "@tanstack/react-query";
import { KeyringPair } from "@polkadot/keyring/types";
import { GDriveExternalAccountStore } from "@aksumite/local-wallets";
import { Dispatch, SetStateAction } from "react";

import { sleep } from "../helpers";
import { assertUploadable } from "../helpers/keystoreBackup";
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

      /*
       * BLOCKER B1. Do not let an unencrypted keystore leave the browser.
       *
       * `toJson(undefined)` does NOT produce a weakly encrypted file, it
       * produces an unencrypted one - see helpers/keystoreBackup.ts and
       * @polkadot/keyring's pair/encode.js. Previously that JSON went straight
       * to Google Drive, so the trading account's secret key was uploaded in
       * the clear whenever the pair happened to be unlocked, which is the
       * ordinary case right after creating an account.
       *
       * This checks the ARTIFACT rather than trusting that a password argument
       * arrived, because trusting the argument is precisely the mistake that
       * produced the bug. It throws rather than skipping: react-query surfaces
       * it through onError as a toast, so the user learns the backup did not
       * happen instead of believing it did.
       */
      assertUploadable(jsonAccount);

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
