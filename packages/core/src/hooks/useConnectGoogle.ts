import { useQuery } from "@tanstack/react-query";
import { GDriveExternalAccountStore } from "@mitra/local-wallets";
import { Dispatch, SetStateAction } from "react";

import { QUERY_KEYS } from "../constants";

export const useConnectGoogle = ({
  GoogleDrive,
  gDriveReady,
  setGDriveReady,
  enabled,
}: {
  GoogleDrive: GDriveExternalAccountStore;
  gDriveReady: boolean;
  setGDriveReady: Dispatch<SetStateAction<boolean>>;
  enabled: boolean;
}) =>
  useQuery({
    staleTime: 100000,
    enabled,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    retry: false,
    initialData: undefined,
    queryKey: [QUERY_KEYS.googleSession()],
    queryFn: async () => {
      if (!gDriveReady) {
        await GoogleDrive.init();
        setGDriveReady(true);
      }
      return true;
    },
  });
