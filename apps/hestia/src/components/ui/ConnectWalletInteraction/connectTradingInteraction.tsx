"use client";

import { Interactable, Modal, useInteractableProvider } from "@polkadex/ux";
import { useSettingsProvider } from "@orderbook/core/providers/public/settings";
import { useConnectWalletProvider } from "@orderbook/core/providers/user/connectWalletProvider";
import { Fragment, useMemo } from "react";
import { TradeAccount } from "@orderbook/core/providers/types";

import { ConnectTradingAccount } from "../ConnectWallet/connectTradingAccount";
import { ImportTradingAccount } from "../ConnectWallet/importTradingAccount";
import { RemoveTradingAccount } from "../ConnectWallet/removeTradingAccount";
import { ImportTradingAccountMnemonic } from "../ConnectWallet/importTradingAccountMnemonic";
import { UnlockAccount } from "../ReadyToUse/unlockAccount";

export const ConnectTradingInteraction = () => {
  const { connectTrading, onToogleConnectTrading } = useSettingsProvider();
  const onClose = () => onToogleConnectTrading(false);

  return (
    <Modal
      open={!!connectTrading}
      onOpenChange={onToogleConnectTrading}
      closeOnClickOutside
    >
      <Modal.Content>
        <Interactable>
          <Interactable.Trigger>
            <TriggerCompontent onClose={onClose} />
          </Interactable.Trigger>
          <Interactable.Content>
            <CardsCompontent onClose={onClose} />
          </Interactable.Content>
        </Interactable>
      </Modal.Content>
    </Modal>
  );
};

const TriggerCompontent = ({ onClose }: { onClose: () => void }) => {
  const {
    localTradingAccounts,
    onSelectTradingAccount,
    onSetTempTrading,
    onExportTradeAccount,
    onBackupGoogleDrive,
    backupGoogleDriveLoading,
    onConnectGoogleDrive,
    connectGoogleDriveLoading,
    gDriveReady,
  } = useConnectWalletProvider();

  const { setPage } = useInteractableProvider();
  return (
    <ConnectTradingAccount
      key="ConnectTradingAccount"
      accounts={localTradingAccounts}
      onSelect={(e) => onSelectTradingAccount(e)}
      onTempBrowserAccount={(e) => onSetTempTrading?.(e)}
      onClose={onClose}
      onImport={() => setPage("ImportTradingAccount")}
      onSelectCallback={onClose}
      onRemoveCallback={() => setPage("RemoveTradingAccount")}
      onExportBrowserAccount={(account) => onExportTradeAccount({ account })}
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
  );
};

const CardsCompontent = ({ onClose }: { onClose: () => void }) => {
  const {
    selectedWallet,
    selectedExtension,
    localTradingAccounts,
    onImportFromFile,
    importFromFileStatus,
    onRemoveTradingAccountFromDevice,
    tempTrading,
    mainProxiesAccounts,
    onExportTradeAccount,
    onResetTempTrading,
    importFromMnemonicError,
    importFromMnemonicStatus,
    onImportFromMnemonic,
    onRemoveGoogleDrive,
    removeGoogleDriveLoading,
    onBackupGoogleDrive,
    backupGoogleDriveLoading,
  } = useConnectWalletProvider();
  const { onReset, setPage } = useInteractableProvider();
  const availableOnDevice = useMemo(
    () =>
      localTradingAccounts?.some(
        (value) => value.address === tempTrading?.address
      ),
    [tempTrading?.address, localTradingAccounts]
  );

  return (
    <Fragment>
      <Interactable.Card pageName="UnlockBrowserAccount">
        <UnlockAccount
          tempBrowserAccount={tempTrading}
          onClose={onReset}
          onAction={(account, password) =>
            onExportTradeAccount({ account, password })
          }
          onResetTempBrowserAccount={onResetTempTrading}
        />
      </Interactable.Card>
      <Interactable.Card pageName="ImportTradingAccount">
        <ImportTradingAccount
          onImport={async (e) => await onImportFromFile?.(e)}
          onRedirect={onClose}
          onClose={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onReset();
          }}
          loading={importFromFileStatus === "loading"}
          whitelistBrowserAccounts={
            Object.keys(selectedWallet ?? {}).length
              ? mainProxiesAccounts
              : undefined
          }
        />
      </Interactable.Card>
      <Interactable.Card pageName="ImportTradingAccountMnemonic">
        <ImportTradingAccountMnemonic
          onImport={async (e) => {
            await onImportFromMnemonic?.(e);
            onReset();
          }}
          onCancel={onReset}
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
          onCancel={onReset}
          availableOnDevice={availableOnDevice}
          enabledExtensionAccount={!selectedWallet}
          loading={removeGoogleDriveLoading}
          fundWallet={selectedWallet}
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
    </Fragment>
  );
};
