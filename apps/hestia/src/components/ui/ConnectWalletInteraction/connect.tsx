"use client";

import { useExtensionAccounts, useExtensions } from "@polkadex/react-providers";
import { Fragment, useCallback, useMemo } from "react";
import {
  Interactable,
  useInteractableProvider,
  ExtensionAccounts,
  ConnectWallet,
} from "@polkadex/ux";
import { useConnectWalletProvider } from "@orderbook/core/providers/user/connectWalletProvider";
import { TradeAccount } from "@orderbook/core/providers/types";
import { useSettingsProvider } from "@orderbook/core/providers/public/settings";
import { useProfile } from "@orderbook/core/providers/user/profile";
import { usePathname, useRouter } from "next/navigation";

import { ConnectTradingAccount } from "../ConnectWallet/connectTradingAccount";
import { ImportTradingAccount } from "../ConnectWallet/importTradingAccount";
import { ImportTradingAccountMnemonic } from "../ConnectWallet/importTradingAccountMnemonic";
import { RemoveTradingAccount } from "../ConnectWallet/removeTradingAccount";
import { ConnectTradingAccountCard } from "../ReadyToUse/connectTradingAccountCard";
import { UnlockAccount } from "../ReadyToUse/unlockAccount";

import { InteractableProps } from ".";

export const Connect = ({ onClose, onNext }: InteractableProps) => {
  return (
    <Interactable>
      <Interactable.Trigger>
        <TriggerCompontent onClose={onClose} />
      </Interactable.Trigger>
      <Interactable.Content>
        <CardsCompontent onClose={onClose} onNext={onNext} />
      </Interactable.Content>
    </Interactable>
  );
};

const TriggerCompontent = ({ onClose }: { onClose: () => void }) => {
  const { setPage } = useInteractableProvider();
  const { onSelectExtension, localTradingAccounts } =
    useConnectWalletProvider();
  const { extensionsStatus } = useExtensions();

  return (
    <ConnectWallet
      installedExtensions={extensionsStatus}
      onConnectProvider={(e) => onSelectExtension?.(e)}
      onBack={onClose}
      onConnectCallback={() => setPage("ConnectFundingWallets")}
    >
      <ConnectTradingAccountCard
        tradingAccountLentgh={localTradingAccounts?.length ?? 0}
        onOpenInteraction={() => setPage("ConnectTradingAccount")}
      />
    </ConnectWallet>
  );
};

const CardsCompontent = ({ onClose, onNext }: InteractableProps) => {
  const path = usePathname();
  const router = useRouter();
  const {
    selectedExtension,
    selectedWallet,
    onSelectWallet,
    onSelectExtension,
    localTradingAccounts,
    onSelectTradingAccount,
    onImportFromFile,
    importFromFileStatus,
    onRemoveTradingAccountFromDevice,
    onSetTempTrading,
    tempTrading,
    mainProxiesLoading,
    mainProxiesSuccess,
    onExportTradeAccount,
    onResetTempTrading,
    importFromMnemonicError,
    importFromMnemonicStatus,
    onImportFromMnemonic,
    hasAccount,
    onBackupGoogleDrive,
    backupGoogleDriveLoading,
    onConnectGoogleDrive,
    connectGoogleDriveLoading,
    gDriveReady,
    onRemoveGoogleDrive,
    removeGoogleDriveLoading,
    browserAccountPresent,
  } = useConnectWalletProvider();
  const { onToogleConnectExtension } = useSettingsProvider();
  const { allAccounts } = useProfile();

  const { setPage, onReset } = useInteractableProvider();
  const sourceId = selectedExtension?.id;

  const { connectExtensionAccounts, extensionAccounts } =
    useExtensionAccounts();

  const walletsFiltered = useMemo(
    () =>
      extensionAccounts?.filter(
        ({ source, type }) => source === sourceId && type === "sr25519"
      ),
    [extensionAccounts, sourceId]
  );

  const onRedirect = useCallback(() => {
    if (!selectedWallet) return null;

    if (browserAccountPresent || !hasAccount) {
      if (path === "/") router.push("/trading/PDEXUSDT");
      onToogleConnectExtension(false);
      return;
    }

    return onNext("ExistingUser");
  }, [
    hasAccount,
    onNext,
    onToogleConnectExtension,
    browserAccountPresent,
    selectedWallet,
    path,
    router,
  ]);

  const availableOnDevice = useMemo(
    () =>
      localTradingAccounts?.some(
        (value) => value.address === tempTrading?.address
      ),
    [tempTrading?.address, localTradingAccounts]
  );

  // Used only for removing trading account from blockchain
  const choosenfundingWallet = useMemo(() => {
    const mainAddress = allAccounts.find(
      (a) => a.tradeAddress === tempTrading?.address
    )?.mainAddress;

    if (!mainAddress) return undefined;

    return extensionAccounts.find((e) => e.address === mainAddress);
  }, [allAccounts, extensionAccounts, tempTrading?.address]);

  return (
    <Fragment>
      <Interactable.Card pageName="ConnectFundingWallets">
        <ExtensionAccounts
          extensionAccounts={walletsFiltered}
          loading={!!mainProxiesLoading}
          success={!!mainProxiesSuccess}
          onSelectExtensionAccount={async (e) => await onSelectWallet?.(e)}
          onTryAgain={() =>
            selectedExtension && onSelectExtension?.(selectedExtension)
          }
          onRefresh={async () =>
            await connectExtensionAccounts(selectedExtension?.title as string)
          }
          onClose={onReset}
          onRedirect={onRedirect}
          onPermission={async () =>
            await connectExtensionAccounts(selectedExtension?.id as string)
          }
          extensionIcon={selectedExtension?.id as string}
          extensionName={selectedExtension?.title}
        />
      </Interactable.Card>
      <Interactable.Card pageName="UnlockBrowserAccount">
        <UnlockAccount
          tempBrowserAccount={tempTrading}
          onClose={() => setPage("ConnectTradingAccount")}
          onAction={(account, password) =>
            onExportTradeAccount({ account, password })
          }
          onResetTempBrowserAccount={onResetTempTrading}
        />
      </Interactable.Card>
      <Interactable.Card pageName="ExportGoogleDriveAccount">
        <UnlockAccount
          tempBrowserAccount={tempTrading}
          onClose={() => setPage("ConnectTradingAccount")}
          onAction={async (account, password) =>
            await onBackupGoogleDrive({ account, password })
          }
          onResetTempBrowserAccount={onResetTempTrading}
          loading={backupGoogleDriveLoading}
        />
      </Interactable.Card>
      <Interactable.Card pageName="ConnectTradingAccount">
        <ConnectTradingAccount
          accounts={localTradingAccounts}
          onSelect={(e) => onSelectTradingAccount(e)}
          onTempBrowserAccount={(e) => onSetTempTrading?.(e)}
          onClose={onReset}
          onImport={() => setPage("ImportTradingAccount")}
          onSelectCallback={onClose}
          onRemoveCallback={() => setPage("RemoveTradingAccount")}
          onExportBrowserAccount={(account) =>
            onExportTradeAccount({ account })
          }
          onExportBrowserAccountCallback={() => setPage("UnlockBrowserAccount")}
          onImportMnemonic={() => setPage("ImportTradingAccountMnemonic")}
          onExportGoogleCallback={() => setPage("ExportGoogleDriveAccount")}
          enabledExtensionAccount
          backupGDriveAccountLoading={backupGoogleDriveLoading}
          onBackupGDriveAccount={(account) => onBackupGoogleDrive({ account })}
          onConnectGDrive={onConnectGoogleDrive}
          connectGDriveLoading={connectGoogleDriveLoading}
          gDriveReady={gDriveReady}
        />
      </Interactable.Card>
      <Interactable.Card pageName="ImportTradingAccount">
        <ImportTradingAccount
          onImport={async (e) => {
            await onImportFromFile?.(e);
            onClose();
          }}
          onRedirect={() => setPage("ConnectTradingAccount")}
          onClose={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setPage("ConnectTradingAccount");
          }}
          loading={importFromFileStatus === "loading"}
        />
      </Interactable.Card>

      <Interactable.Card pageName="ImportTradingAccountMnemonic">
        <ImportTradingAccountMnemonic
          onImport={async (e) => {
            await onImportFromMnemonic?.(e);
            onClose();
          }}
          onCancel={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setPage("ConnectTradingAccount");
          }}
          loading={importFromMnemonicStatus === "loading"}
          errorMessage={
            (importFromMnemonicError as Error)?.message ??
            importFromMnemonicError
          }
        />
      </Interactable.Card>
      <Interactable.Card pageName="RemoveTradingAccount">
        <RemoveTradingAccount
          tradingAccount={tempTrading as TradeAccount}
          onRemoveFromDevice={(e) => onRemoveTradingAccountFromDevice(e)}
          onRemoveGoogleDrive={async (e) => await onRemoveGoogleDrive(e)}
          selectedExtension={selectedExtension}
          availableOnDevice={availableOnDevice}
          onCancel={() => setPage("ConnectTradingAccount")}
          enabledExtensionAccount
          loading={removeGoogleDriveLoading}
          fundWallet={choosenfundingWallet}
        />
      </Interactable.Card>
    </Fragment>
  );
};
