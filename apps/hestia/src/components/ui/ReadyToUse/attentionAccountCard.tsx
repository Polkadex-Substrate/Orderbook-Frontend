import { RiAlertLine, RiCloudLine } from "@remixicon/react";
import { Fragment, MouseEvent, useCallback, useMemo, useState } from "react";
import {
  Button,
  Copy,
  PopConfirm,
  Skeleton,
  Typography,
  truncateString,
} from "@mitra/ux";
import classNames from "classnames";
import { TradeAccount } from "@orderbook/core/providers/types";
import { useConnectWalletProvider } from "@orderbook/core/providers/user/connectWalletProvider";
import { useExtensionAccountFromBrowserAccount } from "@orderbook/core/index";

import { Unlock } from "@/components/trading/PlaceOrder/unlock";

export const AttentionAccountCard = ({
  account,
  onRemove,
}: {
  account: TradeAccount;
  onRemove: () => void;
}) => {
  const shortAddress = useMemo(
    () => truncateString(account.address),
    [account.address]
  );
  const [showPassword, setShowPassword] = useState(false);
  const { onImportFromGoogle } = useConnectWalletProvider();
  const { isLoading, isError } = useExtensionAccountFromBrowserAccount(
    account.address,
    true
  );

  const handleImport = useCallback(
    async (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (account?.isLocked) {
        try {
          account.unlock("");
          await onImportFromGoogle({ account, password: "" });
        } catch (error) {
          setShowPassword(true);
        }
      }
    },
    [onImportFromGoogle, account]
  );

  const handleRemove = useCallback(
    async (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      onRemove();
    },
    [onRemove]
  );

  return (
    <Fragment>
      <div
        className={classNames(
          "w-full flex flex-col rounded-md border border-primary duration-300 transition-colors"
        )}
      >
        <div className="flex flex-1 justify-between items-start gap-2 pt-4 pb-3 pl-4 pr-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Copy value={account.address} />
              <Skeleton loading={!account.address}>
                <Typography.Text bold size="md">
                  {account.meta.name}
                </Typography.Text>
              </Skeleton>
            </div>
            <Skeleton loading={!account.address}>
              <Typography.Text appearance="primary">
                {shortAddress}
              </Typography.Text>
            </Skeleton>
          </div>
          <PopConfirm open={showPassword} onOpenChange={setShowPassword}>
            <PopConfirm.Trigger asChild={!isLoading}>
              <Skeleton loading={isLoading} className="min-w-20 min-h-6">
                <Button.Light
                  appearance={isError ? "danger" : "tertiary"}
                  className="h-fit w-fit"
                  disabled={isLoading}
                  onClick={isError ? handleRemove : handleImport}
                >
                  {isError ? "Remove" : "Import"}
                </Button.Light>
              </Skeleton>
            </PopConfirm.Trigger>
            <PopConfirm.Content className="p-0">
              <PopConfirm.Description>
                <Unlock
                  tempBrowserAccount={account}
                  onAction={async (account, password) => {
                    await onImportFromGoogle({ account, password });
                    setShowPassword(false);
                  }}
                />
              </PopConfirm.Description>
            </PopConfirm.Content>
          </PopConfirm>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-grayscale">
          <RiCloudLine className="w-3.5 h-3.5 text-success-base" />
          <Skeleton loading={isLoading} className="max-w-14 min-h-5 bg-level-4">
            <div className="w-fit flex items-center gap-1 bg-danger-base/20 px-2 py-0.5 rounded-full">
              <RiAlertLine className="w-3 h-3 text-danger-base" />
              <Typography.Text appearance="danger" size="xs">
                {isError ? "No linked funding account" : "Require attention"}
              </Typography.Text>
            </div>
          </Skeleton>
        </div>
      </div>
    </Fragment>
  );
};
