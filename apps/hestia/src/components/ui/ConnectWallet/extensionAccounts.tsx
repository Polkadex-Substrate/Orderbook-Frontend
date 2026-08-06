// TODO: Remove it & move to polkadex-ts
import { ExtensionAccount } from "@polkadex/react-providers";
import { useEffect, useRef } from "react";
import {
  Interaction,
  Typography,
  Loading,
  InteractionProps,
  Illustrations,
} from "@polkadex/ux";
import classNames from "classnames";

import { AccountCard } from "../ReadyToUse";

interface ExtensionAccountsProps extends InteractionProps {
  extensionAccounts: ExtensionAccount[];
  onSelectExtensionAccount: (v: ExtensionAccount) => void;
  onClose?: () => void;
  onTryAgain: () => void;
  onRefresh: () => Promise<boolean>;
  onRedirect: () => void;
  loading: boolean;
  success: boolean;
}
export const ExtensionAccounts = ({
  extensionAccounts,
  onSelectExtensionAccount,
  onClose,
  onTryAgain,
  onRefresh,
  onRedirect,
  loading,
  success,
  ...props
}: ExtensionAccountsProps) => {
  const isClicked = useRef(false);
  const hasExtensionAccounts = !!extensionAccounts?.length;

  useEffect(() => {
    if (success && !loading) onRedirect();
  }, [loading, success, onRedirect]);

  return (
    <Loading.Spinner active={isClicked.current && loading}>
      <Interaction className="w-full" {...props}>
        {hasExtensionAccounts && (
          <Interaction.Title onClose={{ onClick: onClose }}>
            Select funding account
          </Interaction.Title>
        )}
        <Interaction.Content withPadding={false}>
          {!hasExtensionAccounts ? (
            <div className="flex flex-col gap-5 items-center px-7 py-8">
              <div className="max-w-[10rem]">
                <Illustrations.WalletNotFound className="w-full text-disabled" />
              </div>
              <div className="flex flex-col items-center gap-1">
                <Typography.Text bold size="xl">
                  No wallets found
                </Typography.Text>
                <Typography.Text appearance="primary">
                  Oops, it looks like you don&apos;t have any wallet.
                </Typography.Text>
              </div>
            </div>
          ) : (
            <div
              className={classNames(
                extensionAccounts?.length > 4 && "border-b border-primary"
              )}
            >
              <Typography.Text
                appearance="secondary"
                size="xs"
                className="px-7"
              >
                Available wallets
              </Typography.Text>
              <div className="flex flex-col px-3 max-h-[200px] overflow-hidden hover:overflow-auto">
                {extensionAccounts.map((value, i) => (
                  <AccountCard
                    key={i}
                    name={value.name}
                    address={value.address}
                    onClick={() => {
                      isClicked.current = true;
                      onSelectExtensionAccount(value);
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </Interaction.Content>
        <Interaction.Footer>
          <Interaction.Action
            appearance="secondary"
            onClick={hasExtensionAccounts ? onTryAgain : onRefresh}
          >
            {hasExtensionAccounts ? "Refresh" : "Try again"}
          </Interaction.Action>
          <Interaction.Close onClick={onClose}>
            Connect other wallet
          </Interaction.Close>
        </Interaction.Footer>
      </Interaction>
    </Loading.Spinner>
  );
};
