import {
  Typography,
  Icon,
  Illustrations,
  Interaction,
  Separator,
} from "@polkadex/ux";
import classNames from "classnames";
import { KeyringPair } from "@polkadot/keyring/types";
import { RiArrowRightSLine } from "@remixicon/react";
import { useConnectWalletProvider } from "@orderbook/core/providers/user/connectWalletProvider";
import { TradeAccount } from "@orderbook/core/providers/types";
import { ExtensionAccount } from "@polkadex/react-providers";

import { GenericHorizontalCard, TradingAccountCard } from "../ReadyToUse";

export const ExistingUser = ({
  onClose,
  onReadMore,
  onBack,
  onCreateTradingAccount,
  onRecover,
  onTradingAccountList,
  accounts,
  registeredProxies,
  fundWallet,
  onSelect,
  onSelectCallback,
  onTempBrowserAccount,
  onRemoveCallback,
  onExportBrowserAccountCallback,
  onExportBrowserAccount,
}: {
  onClose: () => void;
  onReadMore: () => void;
  onCreateTradingAccount: (isExtensionProxy: boolean) => void;
  onTradingAccountList: () => void;
  onRecover: () => void;
  onBack: () => void;
  fundWallet?: ExtensionAccount;
  accounts?: TradeAccount[];
  registeredProxies: string[];
  onSelect: (e: TradeAccount) => void;
  onSelectCallback: () => void;
  onRemoveCallback: () => void;
  onExportBrowserAccountCallback: () => void;
  onExportBrowserAccount: (account: KeyringPair) => void;
  onTempBrowserAccount: (e: TradeAccount) => void;
}) => {
  const hasTradingAccounts = !!accounts?.length;
  const { isStoreInGoogleDrive } = useConnectWalletProvider();

  return (
    <Interaction className="w-full md:min-w-[24rem] md:max-w-[24rem]">
      {hasTradingAccounts && (
        <Interaction.Title onClose={{ onClick: onClose }}>
          Select a trading account
        </Interaction.Title>
      )}
      <Interaction.Content withPadding={false}>
        <div className="flex flex-col gap-6">
          {hasTradingAccounts ? (
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
                  accounts?.length > 1 &&
                    "border-b border-primary overflow-hidden hover:overflow-auto pb-7 scrollbar-hide"
                )}
              >
                {accounts?.map((value, i) => {
                  const externalStored = isStoreInGoogleDrive(value.address);

                  return (
                    <TradingAccountCard
                      key={i}
                      account={value}
                      external={externalStored}
                      onSelect={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onSelect(value);
                        onSelectCallback();
                      }}
                      onRemove={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onTempBrowserAccount(value);
                        onRemoveCallback();
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
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              <div className="w-full px-7">
                <Illustrations.ExistingUserKey />
              </div>
              <div className="flex flex-col gap-5 px-7">
                <div className="flex flex-col gap-1">
                  <Typography.Text bold size="xl">
                    No trading account found in browser
                  </Typography.Text>
                  <Typography.Paragraph size="sm" appearance="primary">
                    You can either register your funding account or can have a
                    trading account in browser to start trading. Import your
                    trading account or set up a new one.
                  </Typography.Paragraph>
                </div>
                <button
                  onClick={onReadMore}
                  className="flex items-center gap-2 text-primary-base"
                >
                  <Icon name="Wallet" className="w-6 h-6" />
                  <Typography.Text className="text-primary-base">
                    Read More
                  </Typography.Text>
                  <RiArrowRightSLine className="w-3 h-3" />
                </button>
              </div>
            </>
          )}
          <div className="flex flex-col gap-2 px-7">
            {hasTradingAccounts && (
              <div className="flex items-center gap-2">
                <Separator.Horizontal className="bg-level-3" />
                <Typography.Text
                  appearance="secondary"
                  size="xs"
                  className="whitespace-nowrap"
                >
                  More options
                </Typography.Text>
              </div>
            )}

            <div className="flex flex-col gap-2">
              {registeredProxies.length > 0 &&
                !registeredProxies.includes(fundWallet?.address as string) && (
                  <GenericHorizontalCard
                    title="Register funding account"
                    icon="Wallet"
                    label="NEW"
                    onClick={() => onCreateTradingAccount(true)}
                  />
                )}
              <GenericHorizontalCard
                title="Create new trading account"
                icon="Plus"
                onClick={() => onCreateTradingAccount(false)}
              />
              <GenericHorizontalCard
                title="Import trading account"
                icon="Recover"
                onClick={onRecover}
              />
              <GenericHorizontalCard
                title={`Registered trading accounts (${registeredProxies.length})`}
                icon="History"
                onClick={onTradingAccountList}
              />
            </div>
          </div>
        </div>
      </Interaction.Content>
      <Interaction.Footer>
        <Interaction.Action onClick={onClose}>Skip</Interaction.Action>
        <Interaction.Close onClick={onBack}>
          Connect other wallet
        </Interaction.Close>
      </Interaction.Footer>
    </Interaction>
  );
};
