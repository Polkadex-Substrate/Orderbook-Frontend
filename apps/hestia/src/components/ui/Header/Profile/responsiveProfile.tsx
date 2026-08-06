"use client";

import { Popover } from "@polkadex/ux";
import {
  TradeAccountType,
  useConnectWalletProvider,
} from "@orderbook/core/providers/user/connectWalletProvider";

import { Content } from "./content";
import { Trigger } from "./trigger";

export const ResponsiveProfile = ({
  browserAccountPresent,
  extensionAccountPresent,
}: {
  browserAccountPresent: boolean;
  extensionAccountPresent: boolean;
}) => {
  const { selectedWallet, selectedTradingAccount } = useConnectWalletProvider();

  return browserAccountPresent || extensionAccountPresent ? (
    <Popover>
      <Popover.Trigger>
        <Trigger
          responsive
          extensionAccountPresent={extensionAccountPresent}
          extensionAccountName={selectedWallet?.name ?? ""}
          browserAccountName={selectedTradingAccount?.account?.meta.name || ""}
          browserAccountPresent={
            !!(
              selectedTradingAccount &&
              selectedTradingAccount?.type === TradeAccountType.Keyring
            )
          }
        />
      </Popover.Trigger>
      <Popover.Content sideOffset={10}>
        <Content />
      </Popover.Content>
      <Popover.Overlay />
    </Popover>
  ) : null;
};
