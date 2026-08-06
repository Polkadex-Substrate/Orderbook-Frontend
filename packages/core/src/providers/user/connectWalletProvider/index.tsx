"use client";

import {
  ExtensionAccount,
  useExtensionAccounts,
  useUserAccounts,
} from "@polkadex/react-providers";
import { KeyringPair$Json, KeyringPair } from "@polkadot/keyring/types";
import FileSaver from "file-saver";
import { ExtensionsArray } from "@polkadot-cloud/assets/extensions";
import {
  PropsWithChildren,
  ReactNode,
  createContext,
  useCallback,
  useMemo,
  useState,
} from "react";
import { UseMutationResult } from "@tanstack/react-query";
import {
  GDriveExternalAccountStore,
  GOOGLE_LOCAL_STORAGE_KEY,
} from "@polkadex/local-wallets";
import { defaultConfig } from "@orderbook/core/config";
import { localStorageOrDefault } from "@polkadex/utils";
import { enabledFeatures } from "@orderbook/core/helpers";

import { POLKADEX_ASSET } from "../../../constants";
import { transformAddress, useProfile } from "../../user/profile";
import {
  AddProxyAccountArgs,
  ImportFromFile,
  ImportFromGoogleAccount,
  ImportFromMnemonic,
  RemoveProxyAccountArgs,
  useAddProxyAccount,
  useBackupTradingAccount,
  useConnectGoogle,
  useGoogleTradingAccounts,
  useImportGoogleAccount,
  useImportProxyAccount,
  useImportProxyAccountMnemonic,
  useOnChainBalances,
  useProxyAccounts,
  useRemoveGoogleTradingAccount,
  useRemoveProxyAccount,
  useSingleProxyAccount,
} from "../../../hooks";
import { useSettingsProvider } from "../../public/settings";
const { googleDriveStore } = enabledFeatures;

export type GenericStatus = "error" | "idle" | "success" | "loading";

export { useConnectWalletProvider } from "./useConnectWallet";
export type ExportTradeAccountProps = {
  account: KeyringPair;
  password?: string;
};

export enum TradeAccountType {
  Extension,
  Keyring,
}
export type SelectedTradingAccount = {
  account?: KeyringPair;
  type: TradeAccountType;
};

type ConnectWalletState = {
  // active extension account
  // TODO: rename to selectedExtensionAccount
  selectedWallet?: ExtensionAccount;
  // active trading account
  selectedTradingAccount?: SelectedTradingAccount;
  // selected extension
  selectedExtension?: (typeof ExtensionsArray)[0];
  // list of all trading accounts in browser
  localTradingAccounts: KeyringPair[];
  // TODO: rename to onSelectExtensionAccount
  onSelectWallet: (payload: ExtensionAccount) => Promise<void>;
  onSelectTradingAccount: (value: KeyringPair) => void;
  // TODO: redefine type in polkadex-ts
  onSelectExtension: (
    payload: (typeof ExtensionsArray)[0],
    callbackFn?: () => void
  ) => void;
  onResetWallet: () => void;
  onResetExtension: () => void;
  onLogout: () => void;
  onImportFromFile: (value: ImportFromFile) => Promise<void>;
  onImportFromMnemonic: (value: ImportFromMnemonic) => Promise<void>;
  onRegisterTradeAccount: (props: AddProxyAccountArgs) => Promise<void>;
  onRemoveTradingAccountFromDevice: (value: string) => Promise<void>;
  onRemoveTradingAccountFromChain: (
    value: RemoveProxyAccountArgs
  ) => Promise<void>;

  onImportFromGoogle: (value: ImportFromGoogleAccount) => Promise<void>;
  importFromGoogleLoading: UseMutationResult["isLoading"];
  importFromGoogleSuccess: UseMutationResult["isSuccess"];
  // TODO: all the below must be moved into local state of ConnectWalletInteraction
  onExportTradeAccount: (value: ExportTradeAccountProps) => void;
  onSetTempTrading: (value: KeyringPair) => void;
  onResetTempMnemonic: () => void;
  onResetTempTrading: () => void;
  tempMnemonic?: string;
  tempTrading?: KeyringPair;
  proxiesAccounts?: string[];
  proxiesStatus: GenericStatus;
  registerStatus: GenericStatus;
  removingStatus: GenericStatus;
  walletBalance?: number;
  walletStatus: GenericStatus;
  importFromFileStatus: GenericStatus;
  importFromMnemonicStatus: GenericStatus;
  // mutation status
  proxiesHasError: boolean;
  proxiesLoading: boolean;
  proxiesSuccess: boolean;
  registerError: unknown;
  removingError: unknown;
  walletHasError: boolean;
  walletLoading: boolean;
  walletSuccess: boolean;
  importFromFileError: unknown;
  mainProxiesAccounts: string[];
  mainProxiesLoading: boolean;
  mainProxiesSuccess: boolean;
  importFromMnemonicError: unknown;
  // TODO: Rename to tradingAccountPresent
  browserAccountPresent: boolean;
  extensionAccountPresent: boolean;
  // TODO: Rename to hasProxyAccounts
  hasAccount: boolean;

  onBackupGoogleDrive: (value: ExportTradeAccountProps) => Promise<void>;
  backupGoogleDriveLoading: UseMutationResult["isLoading"];
  backupGoogleDriveSuccess: UseMutationResult["isSuccess"];

  onConnectGoogleDrive: () => Promise<void>;
  connectGoogleDriveLoading: UseMutationResult["isLoading"];
  connectGoogleDriveSuccess: UseMutationResult["isSuccess"];

  onRemoveGoogleDrive: (value: string) => Promise<void>;
  removeGoogleDriveLoading: UseMutationResult["isLoading"];
  removeGoogleDriveSuccess: UseMutationResult["isSuccess"];

  gDriveReady: boolean;
  isStoreInGoogleDrive: (e: string) => boolean;
  attentionAccounts: KeyringPair[];
  googleDriveAccounts: KeyringPair[];
};

export const ConnectWalletProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const GoogleDrive = useMemo(
    () =>
      new GDriveExternalAccountStore(
        defaultConfig.googleApiKey,
        defaultConfig.googleClientId
      ),
    []
  );

  const [gDriveReady, setGDriveReady] = useState(false);
  const [tempMnemonic, setTempMnemonic] = useState<string>("");
  const [tempTrading, setTempTrading] = useState<KeyringPair>();
  const {
    selectedAddresses,
    onUserSelectMainAddress,
    selectedExtension,
    setSelectedExtension,
    onResetSelectedExtension,
    onUserResetTradingAddress,
    onUserResetMainAddress,
    onUserLogout,
    onUserSelectTradingAddress,
  } = useProfile();
  const { onHandleAlert, onHandleError } = useSettingsProvider();
  const { extensionAccounts } = useExtensionAccounts();
  // TODO: rename to useBrowserAccounts
  const { wallet, isReady, localAddresses } = useUserAccounts();
  const onSetTempMnemonic = (value: string) => setTempMnemonic(value);

  const {
    onChainBalances,
    isOnChainBalanceLoading,
    isOnChainBalanceSuccess,
    isOnChainBalanceError,
    onChainBalanceStatus,
  } = useOnChainBalances();

  const {
    allProxiesAccounts,
    proxiesHasError,
    proxiesLoading,
    proxiesSuccess,
    proxiesStatus,
  } = useProxyAccounts(extensionAccounts);

  const { mainProxiesAccounts, mainProxiesLoading, mainProxiesSuccess } =
    useSingleProxyAccount(selectedAddresses?.mainAddress);

  const {
    error: importFromFileError,
    mutateAsync: onImportFromFile,
    status: importFromFileStatus,
  } = useImportProxyAccount({
    onSuccess: (msg) => msg && onHandleAlert(msg),
  });

  const {
    error: importFromMnemonicError,
    mutateAsync: onImportFromMnemonic,
    status: importFromMnemonicStatus,
  } = useImportProxyAccountMnemonic({
    onSuccess: (msg) => msg && onHandleAlert(msg),
  });

  const selectedWallet = useMemo(
    () =>
      selectedAddresses?.mainAddress
        ? extensionAccounts.find(
            (e) => e.address === selectedAddresses.mainAddress
          )
        : undefined,
    [extensionAccounts, selectedAddresses.mainAddress]
  );

  // Sort proxy accounts in order of thier presence in browser
  const sortedMainProxiesAccounts = useMemo(
    () =>
      mainProxiesAccounts.sort((a, b) => {
        if (localAddresses.indexOf(a) < localAddresses.indexOf(b)) {
          return 1;
        } else {
          return -1;
        }
      }),
    [localAddresses, mainProxiesAccounts]
  );

  const proxiesAccounts = useMemo(() => {
    return allProxiesAccounts
      .filter(({ mainAddress }) =>
        [selectedWallet?.address, tempTrading?.address].includes(mainAddress)
      )
      .map(({ tradeAddress }) => tradeAddress);
  }, [allProxiesAccounts, selectedWallet?.address, tempTrading?.address]);

  const onSelectExtensionAccount = async (payload: ExtensionAccount) => {
    const mainAddress = payload.address;
    await onUserSelectMainAddress({ mainAddress });
  };

  const onSelectExtension = (
    payload: (typeof ExtensionsArray)[0],
    callbackFn?: () => void
  ) => {
    setSelectedExtension(payload);
    callbackFn?.();
  };

  const onSetTempTrading = (value: KeyringPair) => {
    setTempTrading(value);
  };

  const onResetExtension = () => {
    onResetSelectedExtension();
  };

  const onResetWallet = () => {
    onUserResetMainAddress();
  };

  const onResetTempMnemonic = () => {
    setTempMnemonic("");
  };

  const onResetTempTrading = () => {
    setTempTrading(undefined);
  };
  const onLogout = () => {
    onUserLogout();
  };

  const onRemoveTradingAccountFromDevice = async (value: string) => {
    if (selectedAddresses.tradeAddress === value) onUserResetTradingAddress();
    wallet.remove(value);
    onHandleAlert("Trading account removed from device");
  };

  const onExportTradeAccount = ({
    account: tradeAccount,
    password,
  }: ExportTradeAccountProps) => {
    try {
      tradeAccount.isLocked && tradeAccount.unlock(password);
      const blob = new Blob([JSON.stringify(tradeAccount.toJson(password))], {
        type: "text/plain;charset=utf-8",
      });
      FileSaver.saveAs(
        blob,
        `${tradeAccount?.meta?.name}-${transformAddress(
          tradeAccount?.address
        )}.json`
      );
    } catch (error) {
      console.log("error", error);
    }
  };

  const extensionAccountPresent = useMemo(
    () => !!Object.keys(selectedWallet ?? {})?.length,
    [selectedWallet]
  );

  const hasAccount = useMemo(
    () => !!mainProxiesAccounts?.length,
    [mainProxiesAccounts?.length]
  );

  const hasLocalToken = useMemo(
    () => localStorageOrDefault(GOOGLE_LOCAL_STORAGE_KEY, null, true),
    []
  );

  const {
    refetch: onConnectGoogleDrive,
    isLoading: connectGoogleDriveLoading,
    isFetching: connectGoogleDriveFetching,
    isSuccess: connectGoogleDriveSuccess,
  } = useConnectGoogle({
    GoogleDrive,
    gDriveReady,
    setGDriveReady,
    enabled: !!hasLocalToken && googleDriveStore,
  });

  const { data: googleDriveAccounts, refetch: onRefetchGoogleDriveAccounts } =
    useGoogleTradingAccounts({
      GoogleDrive,
      gDriveReady,
    });

  const {
    mutateAsync: onBackupGoogleDrive,
    isLoading: backupGoogleDriveLoading,
    isSuccess: backupGoogleDriveSuccess,
  } = useBackupTradingAccount({
    GoogleDrive,
    gDriveReady,
    setGDriveReady,
    onRefetchGoogleDriveAccounts,
  });

  const onAddAccountFromJson = useCallback(
    (json: KeyringPair$Json) => GoogleDrive.addFromJson(json),
    [GoogleDrive]
  );

  const {
    error: registerError,
    mutateAsync: onRegisterTradeAccount,
    status: registerStatus,
  } = useAddProxyAccount({
    onError: (e: Error) => onHandleError(e.message),
    onSuccess: (msg) => msg && onHandleAlert(msg),
    onSetTempMnemonic,
    onRefetchGoogleDriveAccounts,
    onAddAccountFromJson,
  });

  const {
    mutateAsync: onRemoveGoogleDrive,
    isLoading: removeGoogleDriveLoading,
    isSuccess: removeGoogleDriveSuccess,
  } = useRemoveGoogleTradingAccount({
    GoogleDrive,
    gDriveReady,
    setGDriveReady,
    onRefetchGoogleDriveAccounts,
  });

  const localTradingAccounts = useMemo(
    () =>
      isReady
        ? localAddresses?.map((value) => wallet.getPair(value) as KeyringPair)
        : [],
    [localAddresses, wallet, isReady]
  );

  const selectedTradingAccount = useMemo(() => {
    const selected = selectedAddresses?.tradeAddress;

    if (selected === selectedWallet?.address) {
      return { type: TradeAccountType.Extension };
    }

    const availableLocalAccount = localTradingAccounts?.find(
      (e) => e?.address === selectedAddresses?.tradeAddress
    );

    if (availableLocalAccount && selected && isReady)
      return {
        account: availableLocalAccount,
        type: TradeAccountType.Keyring,
      };
  }, [
    localTradingAccounts,
    isReady,
    selectedAddresses?.tradeAddress,
    selectedWallet?.address,
  ]);

  const browserAccountPresent = useMemo(
    () =>
      selectedTradingAccount?.type === TradeAccountType.Extension
        ? true
        : !!Object.keys(selectedTradingAccount?.account ?? {})?.length,
    [selectedTradingAccount]
  );

  const onSelectTradingAccount = useCallback(
    async (data: KeyringPair) => {
      await onUserSelectTradingAddress({
        tradeAddress: data.address,
      });
    },
    [onUserSelectTradingAddress]
  );

  const isStoreInGoogleDrive = useCallback(
    (address: string) =>
      !!googleDriveAccounts?.find((e) => e.address === address),
    [googleDriveAccounts]
  );

  const {
    error: removingError,
    mutateAsync: onRemoveTradingAccountFromChain,
    status: removingStatus,
  } = useRemoveProxyAccount({
    onError: (e: Error) => onHandleError(e.message),
    onSuccess: (msg) => msg && onHandleAlert(msg),
    onRemoveGoogleDrive,
    googleDriveAccounts,
  });

  const handleConnectGoogleDrive = useCallback(async () => {
    await onConnectGoogleDrive();
  }, [onConnectGoogleDrive]);

  const attentionAccounts = useMemo(
    () =>
      googleDriveAccounts.filter(
        (e) => !localTradingAccounts.some((a) => a.address === e.address)
      ),
    [googleDriveAccounts, localTradingAccounts]
  );

  const {
    mutateAsync: onImportFromGoogle,
    isLoading: importFromGoogleLoading,
    isSuccess: importFromGoogleSuccess,
  } = useImportGoogleAccount({
    onRefetchGoogleDriveAccounts,
  });

  return (
    <Provider
      value={{
        hasAccount,
        browserAccountPresent,
        extensionAccountPresent,
        selectedWallet,
        selectedTradingAccount,
        selectedExtension,
        localTradingAccounts,
        onSelectExtension,
        onSelectTradingAccount,
        onExportTradeAccount,
        onRemoveTradingAccountFromDevice,
        onSelectWallet: onSelectExtensionAccount,
        onSetTempTrading,
        onResetExtension,
        onResetWallet,
        onResetTempMnemonic,
        onResetTempTrading,
        onLogout,

        onRegisterTradeAccount,
        registerError,
        registerStatus,

        onRemoveTradingAccountFromChain,
        removingError,
        removingStatus,

        tempMnemonic,
        tempTrading,

        walletBalance: onChainBalances?.get(POLKADEX_ASSET.id) || 0,
        walletHasError: isOnChainBalanceError,
        walletLoading: isOnChainBalanceLoading,
        walletSuccess: isOnChainBalanceSuccess,
        walletStatus: onChainBalanceStatus,

        proxiesAccounts,
        proxiesHasError,
        proxiesLoading,
        proxiesSuccess,
        proxiesStatus,

        importFromFileError,
        importFromFileStatus,
        onImportFromFile,

        importFromMnemonicError,
        importFromMnemonicStatus,
        onImportFromMnemonic,

        mainProxiesAccounts: sortedMainProxiesAccounts,
        mainProxiesLoading,
        mainProxiesSuccess,

        onBackupGoogleDrive,
        backupGoogleDriveLoading,
        backupGoogleDriveSuccess,

        onConnectGoogleDrive: handleConnectGoogleDrive,
        connectGoogleDriveLoading:
          connectGoogleDriveLoading && connectGoogleDriveFetching,
        connectGoogleDriveSuccess,

        onRemoveGoogleDrive,
        removeGoogleDriveLoading,
        removeGoogleDriveSuccess,

        gDriveReady,
        isStoreInGoogleDrive,
        attentionAccounts,

        onImportFromGoogle,
        importFromGoogleLoading,
        importFromGoogleSuccess,
        googleDriveAccounts,
      }}
    >
      {children}
    </Provider>
  );
};

export const Context = createContext<ConnectWalletState>({
  localTradingAccounts: [],
  onSelectWallet: async () => {},
  onSelectTradingAccount: () => {},
  onSelectExtension: () => {},
  onResetWallet: () => {},
  onResetExtension: () => {},
  onLogout: () => {},
  onImportFromFile: async () => {},
  onImportFromMnemonic: async () => {},
  onRegisterTradeAccount: async () => {},
  onRemoveTradingAccountFromDevice: async () => {},
  onRemoveTradingAccountFromChain: async () => {},
  onExportTradeAccount: () => {},
  onSetTempTrading: () => {},
  onResetTempMnemonic: () => {},
  onResetTempTrading: () => {},
  proxiesAccounts: [],
  proxiesStatus: "idle",
  registerStatus: "idle",
  removingStatus: "idle",
  walletBalance: 0,
  walletStatus: "idle",
  importFromFileStatus: "idle",
  importFromMnemonicStatus: "idle",
  proxiesHasError: false,
  proxiesLoading: false,
  proxiesSuccess: false,
  registerError: undefined,
  removingError: undefined,
  walletHasError: false,
  walletLoading: false,
  walletSuccess: false,
  importFromFileError: undefined,
  importFromMnemonicError: undefined,
  mainProxiesAccounts: [],
  mainProxiesLoading: false,
  mainProxiesSuccess: false,
  extensionAccountPresent: false,
  browserAccountPresent: false,
  hasAccount: false,
  onBackupGoogleDrive: async () => {},
  backupGoogleDriveLoading: true,
  backupGoogleDriveSuccess: false,
  onConnectGoogleDrive: async () => {},
  connectGoogleDriveLoading: true,
  connectGoogleDriveSuccess: false,
  onRemoveGoogleDrive: async () => {},
  removeGoogleDriveLoading: true,
  removeGoogleDriveSuccess: false,
  gDriveReady: false,
  isStoreInGoogleDrive: () => false,
  attentionAccounts: [],
  onImportFromGoogle: async () => {},
  importFromGoogleLoading: true,
  importFromGoogleSuccess: false,
  googleDriveAccounts: [],
});

const Provider = ({
  value,
  children,
}: PropsWithChildren<{ value: ConnectWalletState }>) => {
  return <Context.Provider value={value}>{children}</Context.Provider>;
};
