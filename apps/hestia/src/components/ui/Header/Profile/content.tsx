"use client";

import { Multistep } from "@polkadex/ux";
import { useSettingsProvider } from "@orderbook/core/providers/public/settings";
import { useProfile } from "@orderbook/core/providers/user/profile";
import { useMemo } from "react";
import {
  ExtensionAccount,
  useExtensionAccounts,
  useExtensions,
} from "@polkadex/react-providers";
import { useConnectWalletProvider } from "@orderbook/core/providers/user/connectWalletProvider";
import { MINIMUM_PDEX_REQUIRED } from "@orderbook/core/constants";
import { TradeAccount } from "@orderbook/core/providers/types";
import { ExtensionsArray } from "@polkadot-cloud/assets/extensions";

import { Profile } from "../../ConnectWallet/profile";
import { ConnectExtensionAccount } from "../../ConnectWallet/connnectExtensionAccount";
import { FundAccount } from "../../ConnectWallet/fundAccount";
import { Authorization } from "../../ConnectWallet/authorization";
import { UserActions } from "../../ConnectWallet/userActions";
import { MaximumTradingAccount } from "../../ConnectWallet/maximumTradingAccount";
import { InsufficientBalance } from "../../ConnectWallet/insufficientBalance";
import { NewTradingAccount } from "../../ConnectWallet/newTradingAccount";
import { UnlockAccount } from "../../ReadyToUse/unlockAccount";
import { ConnectTradingAccount } from "../../ConnectWallet/connectTradingAccount";
import { TradingAccountList } from "../../ConnectWallet/tradingAccountList";
import { RemoveTradingAccount } from "../../ConnectWallet/removeTradingAccount";
import { TradingAccountSuccessfull } from "../../ConnectWallet/tradingAccountSuccessfull";
import { TradingAccountMnemonic } from "../../ConnectWallet/tradingAccountMnemonic";
import { ImportTradingAccount } from "../../ConnectWallet/importTradingAccount";
import { ImportTradingAccountMnemonic } from "../../ConnectWallet/importTradingAccountMnemonic";
import { GenericHorizontalCard } from "../../ReadyToUse";
import { RegisterFundingAccount } from "../../ConnectWallet/registerFundingAccount";

export const Content = () => {
  const {
    onSelectExtension,
    extensionAccountPresent,
    mainProxiesAccounts,
    selectedWallet,
    onSelectTradingAccount,
    onLogout,
    localTradingAccounts,
    onSetTempTrading,
    onRegisterTradeAccount,
    selectedExtension,
    registerError,
    walletBalance,
    registerStatus,
    tempTrading,
    onRemoveTradingAccountFromChain,
    onRemoveTradingAccountFromDevice,
    removingStatus,
    removingError,
    onImportFromFile,
    importFromFileStatus,
    tempMnemonic,
    onExportTradeAccount,
    onResetTempTrading,
    onResetTempMnemonic,
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
    selectedTradingAccount,
  } = useConnectWalletProvider();
  const sourceId = selectedExtension?.id;
  const { onToogleConnectExtension } = useSettingsProvider();
  const { extensionsStatus } = useExtensions();
  const { connectExtensionAccounts, extensionAccounts } =
    useExtensionAccounts();
  const {
    selectedAddresses: { mainAddress },
    allAccounts,
  } = useProfile();

  const selectedFundingWallet = useMemo(
    () =>
      selectedWallet ||
      ({
        name: "Wallet not present",
        address: mainAddress,
      } as ExtensionAccount),
    [selectedWallet, mainAddress]
  );

  const walletsFiltered = useMemo(
    () =>
      extensionAccounts?.filter(
        ({ source, type }) => source === sourceId && type === "sr25519"
      ),
    [extensionAccounts, sourceId]
  );

  const isPresent = useMemo(
    () =>
      extensionAccounts?.some(
        (account) => account.address === selectedFundingWallet.address
      ),
    [extensionAccounts, selectedFundingWallet.address]
  );

  const filteredAccounts = useMemo(
    () =>
      localTradingAccounts?.filter((item) =>
        mainProxiesAccounts?.includes(item.address)
      ),
    [localTradingAccounts, mainProxiesAccounts]
  );

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

  const availableOnDevice = useMemo(
    () =>
      localTradingAccounts?.some(
        (value) => value.address === tempTrading?.address
      ),
    [localTradingAccounts, tempTrading?.address]
  );

  // Choose extensionAccount according to tempTrading address
  const tempExtensionAccount = useMemo(() => {
    const mainAddress = allAccounts?.find(
      (acc) => acc.tradeAddress === tempTrading?.address
    )?.mainAddress;

    const extensionAccount = extensionAccounts?.find(
      (acc) => acc.address === mainAddress
    );

    return extensionAccount;
  }, [allAccounts, extensionAccounts, tempTrading?.address]);

  // Choose extension according to tempFundingWallet
  const tempSelectedExtension = useMemo(() => {
    const currentExtension = ExtensionsArray?.find(
      (value) => value.id === tempExtensionAccount?.source
    );
    return currentExtension;
  }, [tempExtensionAccount?.source]);

  return (
    <Multistep.Interactive className="h-auto max-h-screen">
      {(props) => (
        <>
          <Multistep.Trigger>
            <Profile
              tradingAccounts={mainProxiesAccounts}
              onSwitch={() => {
                onToogleConnectExtension();
                onLogout?.();
              }}
              onActions={() => props?.onPage("UserActions", true)}
              onLogout={() => onLogout?.()}
              fundWalletPresent={extensionAccountPresent}
              fundWallet={selectedFundingWallet}
              onConnectWallet={() => props?.onPage("ConnectWallet", true)}
            />
          </Multistep.Trigger>
          <Multistep.Content>
            <NewTradingAccount
              key="NewTradingAccount"
              onCreateAccount={onRegisterTradeAccount}
              loading={registerStatus === "loading"}
              fundWalletPresent={!!Object.keys(selectedWallet ?? {})?.length}
              errorTitle="Error"
              errorMessage={(registerError as Error)?.message ?? registerError}
              selectedExtension={selectedExtension}
              onCreateCallback={() =>
                props?.onPage("TradingAccountSuccessfull", true)
              }
              onClose={() => props?.onPage("UserActions", true)}
              onConnectGDrive={onConnectGoogleDrive}
              connectGDriveLoading={connectGoogleDriveLoading}
              gDriveReady={gDriveReady}
            />
            <UnlockAccount
              key="UnlockBrowserAccount"
              tempBrowserAccount={tempTrading}
              onClose={() => props?.onChangeInteraction(false)}
              onAction={(account, password) =>
                onExportTradeAccount({ account, password })
              }
              onResetTempBrowserAccount={onResetTempTrading}
            />
            <UnlockAccount
              key="ExportGoogleDriveAccount"
              tempBrowserAccount={tempTrading}
              onClose={() => props?.onPage("ConnectTradingAccount")}
              onAction={async (account, password) =>
                await onBackupGoogleDrive({ account, password })
              }
              onResetTempBrowserAccount={onResetTempTrading}
              loading={backupGoogleDriveLoading}
            />
            <ConnectTradingAccount
              key="ConnectTradingAccount"
              accounts={filteredAccounts}
              onSelect={(e) => onSelectTradingAccount(e)}
              onClose={() => props?.onPage("UserActions", true)}
              onImport={() => props?.onPage("ImportTradingAccount")}
              onTempBrowserAccount={(e) => onSetTempTrading?.(e)}
              onSelectCallback={() => props?.onChangeInteraction(false)}
              onRemoveCallback={() => props?.onPage("RemoveTradingAccount")}
              onExportBrowserAccount={(account) =>
                onExportTradeAccount({ account })
              }
              onExportBrowserAccountCallback={() =>
                props?.onPage("UnlockBrowserAccount")
              }
              onImportMnemonic={() =>
                props?.onPage("ImportTradingAccountMnemonic")
              }
              onExportGoogleCallback={() =>
                props?.onPage("ExportGoogleDriveAccount")
              }
              backupGDriveAccountLoading={backupGoogleDriveLoading}
              onBackupGDriveAccount={(account) =>
                onBackupGoogleDrive({ account })
              }
              onConnectGDrive={onConnectGoogleDrive}
              connectGDriveLoading={connectGoogleDriveLoading}
              gDriveReady={gDriveReady}
            >
              <GenericHorizontalCard
                title="Registered trading accounts"
                icon="History"
                onClick={() => props?.onPage("TradingAccountList")}
              >
                View
              </GenericHorizontalCard>
            </ConnectTradingAccount>
            <UserActions
              key="UserActions"
              onClose={() => props?.onChangeInteraction(false)}
              onCreateTradingAccount={(isExtensionProxy: boolean) => {
                const page = getRedirectPage(isExtensionProxy);
                props?.onPage(page, true);
              }}
              onImportTradingAccount={() =>
                props?.onPage("ConnectTradingAccount")
              }
              fundWallet={selectedWallet}
              fundWalletIsPresent={isPresent}
              onTradingAccountList={() => props?.onPage("TradingAccountList")}
              registeredProxies={mainProxiesAccounts}
            />
            <RegisterFundingAccount
              key="RegisterFundingAccount"
              onCreateAccount={onRegisterTradeAccount}
              fundWallet={selectedWallet}
              loading={registerStatus === "loading"}
              onClose={() => props?.onPage("UserActions", true)}
            />
            <TradingAccountList
              key="TradingAccountList"
              tradingAccounts={mainProxiesAccounts}
              browserAccounts={localTradingAccounts}
              onRemove={(e) => onSetTempTrading?.(e)}
              onClose={() => props?.onPage("UserActions", true)}
              onRemoveCallback={() => props?.onPage("RemoveTradingAccount")}
            />
            <RemoveTradingAccount
              key="RemoveTradingAccount"
              tradingAccount={tempTrading as TradeAccount}
              fundWallet={tempExtensionAccount}
              availableOnDevice={availableOnDevice}
              onRemoveFromDevice={(e) => onRemoveTradingAccountFromDevice(e)}
              onRemoveGoogleDrive={async (e) => await onRemoveGoogleDrive(e)}
              onRemoveFromChain={async () =>
                await onRemoveTradingAccountFromChain?.({
                  proxy: tempTrading?.address as string,
                  selectedWallet,
                })
              }
              loading={removingStatus === "loading" || removeGoogleDriveLoading}
              errorTitle="Error"
              errorMessage={(removingError as Error)?.message ?? removingError}
              selectedExtension={tempSelectedExtension}
              onCancel={() => props?.onChangeInteraction(false)}
            />
            <TradingAccountSuccessfull
              key="TradingAccountSuccessfull"
              tradingAccount={selectedTradingAccount?.account}
              onClose={() => {
                onResetTempMnemonic?.();
                props?.onChangeInteraction(false);
              }}
              onTempBrowserAccount={(e) => onSetTempTrading(e)}
              onOpenMnemonic={() =>
                props?.onPage("TradingAccountMnemonic", true)
              }
              onDownloadPdf={() => {}}
              onDownloadJson={(e) => onExportTradeAccount?.({ account: e })}
              onDownloadJsonCallback={() =>
                props?.onPage("UnlockBrowserAccount", true)
              }
            />
            <TradingAccountMnemonic
              key="TradingAccountMnemonic"
              onClose={() => props?.onPage("TradingAccountSuccessfull", true)}
              mnemonic={tempMnemonic?.split(" ") ?? []}
            />
            <ImportTradingAccount
              key="ImportTradingAccount"
              onImport={async (e) => await onImportFromFile?.(e)}
              onRedirect={() => props?.onPage("ConnectTradingAccount")}
              onClose={() => props?.onPage("ConnectTradingAccount")}
              loading={importFromFileStatus === "loading"}
              whitelistBrowserAccounts={mainProxiesAccounts}
            />
            <ImportTradingAccountMnemonic
              key="ImportTradingAccountMnemonic"
              onImport={async (e) => {
                await onImportFromMnemonic?.(e);
                props?.onChangeInteraction(false);
              }}
              onCancel={() => props?.onPage("ConnectTradingAccount")}
              loading={importFromMnemonicStatus === "loading"}
              errorMessage={
                (importFromMnemonicError as Error)?.message ??
                importFromMnemonicError
              }
            />
            <ConnectExtensionAccount
              key="ConnectWallet"
              installedExtensions={extensionsStatus}
              onConnectProvider={(e) => onSelectExtension?.(e)}
              onClose={() => props?.onChangeInteraction(false)}
              onConnectCallback={() =>
                props?.onPage("ConnectAuthorization", true)
              }
            />
            <Authorization
              key="ConnectAuthorization"
              onAction={async () =>
                await connectExtensionAccounts(selectedExtension?.id as string)
              }
              extensionIcon={selectedExtension?.id as string}
              extensionName={selectedExtension?.title}
              onActionCallback={() => props?.onPage("FundAccount")}
              onClose={props?.onReset}
            />
            <FundAccount
              key="FundAccount"
              extensionAccounts={walletsFiltered}
              selectdAccount={selectedFundingWallet}
              onClose={() => props?.onChangeInteraction(false)}
              isPresent={isPresent}
              selectedExtension={selectedExtension}
            />
            <MaximumTradingAccount
              key="MaximumTradingAccount"
              tradingAccounts={mainProxiesAccounts}
              browserAccounts={localTradingAccounts}
              onRemove={(e) => onSetTempTrading?.(e)}
              onClose={() => props?.onPage("UserActions", true)}
              onRemoveCallback={() => props?.onPage("RemoveTradingAccount")}
            />
            <InsufficientBalance
              key="InsufficientBalance"
              balance={walletBalance}
              onClose={() => props?.onChangeInteraction(false)}
            />
          </Multistep.Content>
        </>
      )}
    </Multistep.Interactive>
  );
};
