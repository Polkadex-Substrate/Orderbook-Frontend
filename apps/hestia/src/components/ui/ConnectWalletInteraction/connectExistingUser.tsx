"use client";

import { Fragment, MouseEvent, useCallback, useMemo } from "react";
import { Interactable, useInteractableProvider } from "@polkadex/ux";
import { useConnectWalletProvider } from "@orderbook/core/providers/user/connectWalletProvider";
import { MINIMUM_PDEX_REQUIRED } from "@orderbook/core/constants";
import { TradeAccount } from "@orderbook/core/providers/types";

import { ExistingUser } from "../ConnectWallet/existingUser";
import { NewTradingAccount } from "../ConnectWallet/newTradingAccount";
import { RegisterFundingAccount } from "../ConnectWallet/registerFundingAccount";
import { ConnectTradingAccount } from "../ConnectWallet/connectTradingAccount";
import { RemoveTradingAccount } from "../ConnectWallet/removeTradingAccount";
import { TradingAccountList } from "../ConnectWallet/tradingAccountList";
import { ImportTradingAccount } from "../ConnectWallet/importTradingAccount";
import { MaximumTradingAccount } from "../ConnectWallet/maximumTradingAccount";
import { InsufficientBalance } from "../ConnectWallet/insufficientBalance";
import { ImportTradingAccountMnemonic } from "../ConnectWallet/importTradingAccountMnemonic";
import { UnlockAccount } from "../ReadyToUse/unlockAccount";

import { InteractableProps } from ".";

export const ConnectExistingUser = ({ onClose, onNext }: InteractableProps) => {
  return (
    <Interactable>
      <Interactable.Trigger>
        <TriggerComponent onClose={onClose} onNext={onNext} />
      </Interactable.Trigger>
      <Interactable.Content>
        <CardsComponent onClose={onClose} onNext={onNext} />
      </Interactable.Content>
    </Interactable>
  );
};

const TriggerComponent = ({ onClose, onNext }: InteractableProps) => {
  const {
    selectedWallet,
    localTradingAccounts,
    onSelectTradingAccount,
    onResetWallet,
    onResetExtension,
    onSetTempTrading,
    mainProxiesAccounts,
    walletBalance,
    onExportTradeAccount,
  } = useConnectWalletProvider();

  const filteredAccounts = useMemo(
    () =>
      localTradingAccounts?.filter((item) =>
        mainProxiesAccounts?.includes(item.address)
      ),
    [localTradingAccounts, mainProxiesAccounts]
  );

  const handleCloseInteraction = () => {
    onResetWallet?.();
    onResetExtension?.();
    onNext("Connect");
  };

  const getRedirectPage = (isExtensionProxy: boolean) => {
    const registerProxyAccount = isExtensionProxy
      ? "RegisterFundingAccount"
      : "NewTradingAccount";

    const redirectMaximumAccounts =
      (mainProxiesAccounts?.length ?? 0) >= 3
        ? "MaximumTradingAccount"
        : registerProxyAccount;

    const redirectEnoughBalance =
      (walletBalance ?? 0) >= MINIMUM_PDEX_REQUIRED
        ? redirectMaximumAccounts
        : "InsufficientBalance";

    return redirectEnoughBalance;
  };

  const { setPage } = useInteractableProvider();

  return (
    <ExistingUser
      onClose={onClose}
      onReadMore={() =>
        window.open(
          "https://docs.polkadex.trade/orderbookPolkadexFAQHowToTradeStep3",
          "_blank",
          "noopener, noreferrer"
        )
      }
      onBack={handleCloseInteraction}
      onCreateTradingAccount={(isExtensionProxy: boolean) => {
        const page = getRedirectPage(isExtensionProxy);
        setPage(page);
      }}
      onRecover={() => setPage("ConnectTradingAccount")}
      onTradingAccountList={() => setPage("TradingAccountList")}
      fundWallet={selectedWallet}
      accounts={filteredAccounts}
      registeredProxies={mainProxiesAccounts}
      onSelect={(e) => onSelectTradingAccount?.(e)}
      onSelectCallback={onClose}
      onTempBrowserAccount={(e) => onSetTempTrading?.(e)}
      onRemoveCallback={() => setPage("RemoveTradingAccount")}
      onExportBrowserAccount={(account) => onExportTradeAccount({ account })}
      onExportBrowserAccountCallback={() => setPage("UnlockBrowserAccount")}
    />
  );
};

const CardsComponent = ({ onClose, onNext }: InteractableProps) => {
  const {
    localTradingAccounts,
    onSelectTradingAccount,
    selectedWallet,
    onRegisterTradeAccount,
    registerStatus,
    registerError,
    removingError,
    onSetTempTrading,
    mainProxiesAccounts,
    removingStatus,
    tempTrading,
    onRemoveTradingAccountFromDevice,
    onRemoveTradingAccountFromChain,
    selectedExtension,
    onImportFromFile,
    importFromFileStatus,
    walletBalance,
    onExportTradeAccount,
    onResetTempTrading,
    importFromMnemonicError,
    importFromMnemonicStatus,
    onImportFromMnemonic,
    onBackupGoogleDrive,
    backupGoogleDriveLoading,
    onConnectGoogleDrive,
    connectGoogleDriveLoading,
    gDriveReady,
    onRemoveGoogleDrive,
    removeGoogleDriveLoading,
  } = useConnectWalletProvider();
  const { setPage, onReset } = useInteractableProvider();

  const filteredAccounts = useMemo(
    () =>
      localTradingAccounts?.filter((item) =>
        mainProxiesAccounts?.includes(item.address)
      ),
    [localTradingAccounts, mainProxiesAccounts]
  );

  const availableOnDevice = useMemo(
    () =>
      filteredAccounts?.some((value) => value.address === tempTrading?.address),
    [tempTrading?.address, filteredAccounts]
  );

  const handleClose = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      e.preventDefault();
      onReset();
    },
    [onReset]
  );

  return (
    <Fragment>
      <Interactable.Card pageName="ConnectTradingAccount">
        <ConnectTradingAccount
          accounts={filteredAccounts}
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
          backupGDriveAccountLoading={backupGoogleDriveLoading}
          onBackupGDriveAccount={(account) => onBackupGoogleDrive({ account })}
          onConnectGDrive={onConnectGoogleDrive}
          connectGDriveLoading={connectGoogleDriveLoading}
          gDriveReady={gDriveReady}
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
      <Interactable.Card pageName="RegisterFundingAccount">
        <RegisterFundingAccount
          onCreateAccount={async (e) => {
            await onRegisterTradeAccount(e);
            onClose();
          }}
          fundWallet={selectedWallet}
          loading={registerStatus === "loading"}
          onClose={onReset}
        />
      </Interactable.Card>
      <Interactable.Card pageName="NewTradingAccount">
        <NewTradingAccount
          onCreateAccount={onRegisterTradeAccount}
          loading={registerStatus === "loading"}
          fundWalletPresent={!!Object.keys(selectedWallet ?? {})?.length}
          errorTitle="Error"
          errorMessage={(registerError as Error)?.message ?? registerError}
          selectedExtension={selectedExtension}
          onCreateCallback={() => onNext("TradingAccountSuccessfull")}
          onClose={handleClose}
          onConnectGDrive={onConnectGoogleDrive}
          connectGDriveLoading={connectGoogleDriveLoading}
          gDriveReady={gDriveReady}
        />
      </Interactable.Card>
      <Interactable.Card pageName="TradingAccountList">
        <TradingAccountList
          tradingAccounts={mainProxiesAccounts}
          browserAccounts={localTradingAccounts}
          onRemove={(e) => onSetTempTrading?.(e)}
          onClose={handleClose}
          onRemoveCallback={() => setPage("RemoveTradingAccount")}
        />
      </Interactable.Card>
      <Interactable.Card pageName="RemoveTradingAccount">
        <RemoveTradingAccount
          tradingAccount={tempTrading as TradeAccount}
          fundWallet={selectedWallet}
          availableOnDevice={availableOnDevice}
          onRemoveFromDevice={(e) => onRemoveTradingAccountFromDevice(e)}
          onRemoveGoogleDrive={async (e) => await onRemoveGoogleDrive(e)}
          onRemoveFromChain={async (e) =>
            await onRemoveTradingAccountFromChain?.({ ...e, selectedWallet })
          }
          loading={removingStatus === "loading" || removeGoogleDriveLoading}
          errorTitle="Error"
          errorMessage={(removingError as Error)?.message ?? removingError}
          selectedExtension={selectedExtension}
          onCancel={handleClose}
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
          whitelistBrowserAccounts={mainProxiesAccounts}
        />
      </Interactable.Card>
      <Interactable.Card pageName="ImportTradingAccountMnemonic">
        <ImportTradingAccountMnemonic
          onImport={async (e) => {
            await onImportFromMnemonic?.(e);
            onClose();
          }}
          onCancel={() => setPage("ConnectTradingAccount")}
          loading={importFromMnemonicStatus === "loading"}
          errorMessage={
            (importFromMnemonicError as Error)?.message ??
            importFromMnemonicError
          }
        />
      </Interactable.Card>
      <Interactable.Card pageName="MaximumTradingAccount">
        <MaximumTradingAccount
          tradingAccounts={mainProxiesAccounts}
          browserAccounts={localTradingAccounts}
          onRemove={(e) => onSetTempTrading?.(e)}
          onClose={handleClose}
          onRemoveCallback={() => setPage("RemoveTradingAccount")}
        />
      </Interactable.Card>
      <Interactable.Card pageName="InsufficientBalance">
        <InsufficientBalance balance={walletBalance} onClose={onReset} />
      </Interactable.Card>
    </Fragment>
  );
};
