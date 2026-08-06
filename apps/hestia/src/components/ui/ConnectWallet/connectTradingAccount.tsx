import {
  Illustrations,
  Interaction,
  Loading,
  Separator,
  Skeleton,
  Typography,
} from "@mitrabook/ux";
import { KeyringPair } from "@polkadot/keyring/types";
import { PropsWithChildren, useMemo } from "react";
import classNames from "classnames";
import { useConnectWalletProvider } from "@orderbook/core/providers/user/connectWalletProvider";
import { TradeAccount } from "@orderbook/core/providers/types";
import { enabledFeatures } from "@orderbook/core/helpers";

import {
  TradingAccountCard,
  GenericHorizontalCard,
  AttentionAccountCard,
} from "../ReadyToUse";
const { googleDriveStore } = enabledFeatures;

export const ConnectTradingAccount = ({
  accounts = [],
  onClose,
  onImport,
  onImportMnemonic,
  onSelect,
  onTempBrowserAccount,
  onSelectCallback,
  onRemoveCallback,
  onExportBrowserAccountCallback,
  onExportBrowserAccount,
  onBackupGDriveAccount,
  onConnectGDrive,
  backupGDriveAccountLoading,
  enabledExtensionAccount = false,
  connectGDriveLoading,
  gDriveReady,
  onExportGoogleCallback,
  children,
}: PropsWithChildren<{
  accounts?: TradeAccount[];
  onClose: () => void;
  onImport: () => void;
  onImportMnemonic: () => void;
  onSelect: (e: TradeAccount) => void;
  onTempBrowserAccount: (e: TradeAccount) => void;
  onSelectCallback: () => void;
  onRemoveCallback: () => void;
  onExportGoogleCallback: () => void;
  onExportBrowserAccountCallback: () => void;
  onExportBrowserAccount: (account: KeyringPair) => void;
  onBackupGDriveAccount: (account: KeyringPair) => Promise<void>;
  onConnectGDrive: () => Promise<void>;
  enabledExtensionAccount?: boolean;
  backupGDriveAccountLoading?: boolean;
  connectGDriveLoading?: boolean;
  gDriveReady?: boolean;
}>) => {
  const { isStoreInGoogleDrive, attentionAccounts } =
    useConnectWalletProvider();

  const tradingAccounts = useMemo(
    () => accounts?.length + attentionAccounts.length,
    [accounts?.length, attentionAccounts.length]
  );
  return (
    <Loading.Spinner active={backupGDriveAccountLoading}>
      <Interaction className="w-full md:min-w-[24rem] md:max-w-[24rem]">
        <Interaction.Title onClose={{ onClick: onClose }}>
          Select / Import Trading Account
        </Interaction.Title>
        <Interaction.Content withPadding={false}>
          <div className="flex flex-col gap-6">
            {tradingAccounts ? (
              <div className="flex flex-col gap-3">
                <Typography.Text
                  appearance="secondary"
                  size="sm"
                  className="px-7"
                >
                  Available trading account(s)
                </Typography.Text>
                <div
                  className={classNames(
                    "flex flex-col gap-3 max-h-[10rem] px-7",
                    tradingAccounts > 1 &&
                      "border-b border-primary overflow-hidden hover:overflow-auto pb-7 scrollbar-hide"
                  )}
                >
                  {connectGDriveLoading && (
                    <Skeleton loading className="min-h-14 rounded-sm" />
                  )}
                  {attentionAccounts?.map((e) => (
                    <AttentionAccountCard
                      key={e.address}
                      account={e}
                      onRemove={() => {
                        onTempBrowserAccount(e);
                        onRemoveCallback();
                      }}
                    />
                  ))}
                  {accounts?.map((value, i) => {
                    const externalStored = isStoreInGoogleDrive(value.address);
                    return (
                      <TradingAccountCard
                        key={i}
                        account={value}
                        enabledExtensionAccount={enabledExtensionAccount}
                        external={externalStored}
                        onRemove={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onTempBrowserAccount(value);
                          onRemoveCallback();
                        }}
                        onSelect={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onSelect(value);
                          onSelectCallback();
                        }}
                        onExport={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          try {
                            if (value.isLocked) value.unlock("");
                            onExportBrowserAccount(value);
                          } catch (error) {
                            onTempBrowserAccount(value);
                            onExportBrowserAccountCallback();
                          }
                        }}
                        onBackupGDrive={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (value?.isLocked) {
                            onTempBrowserAccount(value);
                            onExportGoogleCallback();
                            return;
                          }
                          await onBackupGDriveAccount(value);
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            ) : connectGDriveLoading ? (
              <div className="flex flex-col gap-3 px-6">
                <Skeleton loading className="min-h-10" />
                <Skeleton loading className="min-h-10" />
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-md border-primary mx-7 p-5 flex flex-col gap-5 items-center">
                <div className="max-w-[13rem]">
                  <Illustrations.WalletNotFound className="max-w-[10rem] w-full text-disabled" />
                </div>
                <div className="flex flex-col text-center items-center gap-1">
                  <Typography.Text bold size="md">
                    No trading accounts found
                  </Typography.Text>
                  <Typography.Text appearance="primary">
                    Oops, it looks like you don&apos;t have any trading account.
                  </Typography.Text>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 px-7">
              <div className="flex items-center gap-2">
                <Separator.Horizontal className="bg-level-3" />
                <Typography.Text
                  appearance="secondary"
                  size="xs"
                  className="whitespace-nowrap"
                >
                  Or restore your trading account using
                </Typography.Text>
              </div>
              <div className="flex flex-col gap-2">
                <GenericHorizontalCard
                  title="Google Drive"
                  icon="GoogleDrive"
                  onClick={googleDriveStore ? onConnectGDrive : undefined}
                  loading={connectGDriveLoading}
                  disabled={!googleDriveStore}
                >
                  {gDriveReady ? (
                    <div className="bg-success-base/20 text-success-base text-sm px-2 py-1 rounded-sm">
                      Connected
                    </div>
                  ) : (
                    "Connect"
                  )}
                </GenericHorizontalCard>
                <GenericHorizontalCard
                  title="Import from my PC"
                  icon="Folder"
                  onClick={onImport}
                >
                  Import
                </GenericHorizontalCard>
                <GenericHorizontalCard
                  title="Import with Mnemonic"
                  icon="Mnemonic"
                  onClick={onImportMnemonic}
                >
                  Import
                </GenericHorizontalCard>
                {children}
              </div>
            </div>
          </div>
        </Interaction.Content>
        <Interaction.Footer>
          <Interaction.Close onClick={onClose}>Close</Interaction.Close>
        </Interaction.Footer>
      </Interaction>
    </Loading.Spinner>
  );
};
