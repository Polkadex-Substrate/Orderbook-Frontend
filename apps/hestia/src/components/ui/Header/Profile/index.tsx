"use client";

import { Button, Popover, Tooltip } from "@mitrabook/ux";
import { useMemo } from "react";
import Link from "next/link";
import {
  TradeAccountType,
  useConnectWalletProvider,
} from "@orderbook/core/providers/user/connectWalletProvider";
import { useWindowSize } from "react-use";
import {
  RiBookReadLine,
  RiMenuLine,
  RiNotification3Line,
  RiWalletLine,
} from "@remixicon/react";

import { Trigger } from "./trigger";
import { Content } from "./content";

import Badge from "@/components/ui/Temp/badge";

export const Profile = ({
  onClick,
  onOpenMenu,
  onOpenNotifications,
  onOpenFundWallet,
  unreadNotifications,
  hideConnect = false,
}: {
  onClick: () => void;
  onOpenMenu: () => void;
  onOpenNotifications: () => void;
  onOpenFundWallet: () => void;
  showFundingWallet: boolean;
  unreadNotifications: number;
  /** Suppress the app-level connect button where the page owns connection
   *  itself. Set on /bridge, which has its own per-chain connect controls and
   *  a submit button that walks through them. See Header/index.tsx. */
  hideConnect?: boolean;
}) => {
  const { width } = useWindowSize();
  const {
    selectedWallet,
    browserAccountPresent,
    extensionAccountPresent,
    selectedTradingAccount,
  } = useConnectWalletProvider();

  const responsiveView = useMemo(() => width > 640, [width]);

  if (browserAccountPresent || extensionAccountPresent)
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <Button.Solid
            size="2sm"
            data-tour="fund-account-btn"
            onClick={onOpenFundWallet}
          >
            Fund Account
          </Button.Solid>
          <Tooltip>
            <Tooltip.Trigger asChild>
              <Link href="/balances">
                <Button.Icon className="max-sm:p-0">
                  <RiWalletLine className="h-full w-full" />
                </Button.Icon>
              </Link>
            </Tooltip.Trigger>
            <Tooltip.Content>Balances</Tooltip.Content>
          </Tooltip>
          <Tooltip>
            <Tooltip.Trigger asChild>
              <Link href="/history">
                <Button.Icon className="max-sm:p-0">
                  <RiBookReadLine className="h-full w-full" />
                </Button.Icon>
              </Link>
            </Tooltip.Trigger>
            <Tooltip.Content>History</Tooltip.Content>
          </Tooltip>
          <Tooltip>
            <Tooltip.Trigger asChild>
              <Button.Icon className="relative" onClick={onOpenNotifications}>
                <RiNotification3Line className="h-full w-full" />
                {unreadNotifications > 0 && (
                  <Badge className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4">
                    {unreadNotifications > 9 ? `9+` : `${unreadNotifications}`}
                  </Badge>
                )}
              </Button.Icon>
            </Tooltip.Trigger>
            <Tooltip.Content>Notifications</Tooltip.Content>
          </Tooltip>
        </div>
        {responsiveView && (
          <Popover>
            <Popover.Trigger superpositionTrigger>
              <Trigger
                extensionAccountPresent={extensionAccountPresent}
                extensionAccountName={selectedWallet?.name ?? ""}
                browserAccountName={
                  selectedTradingAccount?.account?.meta.name || ""
                }
                browserAccountPresent={
                  !!(
                    selectedTradingAccount &&
                    selectedTradingAccount?.type === TradeAccountType.Keyring
                  )
                }
              />
            </Popover.Trigger>
            <Popover.Content withArrow className="z-[15]">
              <Content />
            </Popover.Content>
            <Popover.Overlay className="z-[14]" />
          </Popover>
        )}

        <Button.Icon variant="ghost" onClick={onOpenMenu}>
          <RiMenuLine className="h-full w-full" />
        </Button.Icon>
      </div>
    );
  // The hamburger stays either way: it is the only route to the menu on mobile.
  if (hideConnect)
    return (
      <div className="flex items-center gap-2">
        <Button.Icon variant="ghost" onClick={onOpenMenu}>
          <RiMenuLine className="h-full w-full" />
        </Button.Icon>
      </div>
    );

  return (
    <div data-tour="connect-wallet-btn" className="flex items-center gap-2">
      <Button.Solid size="2sm" className="font-medium" onClick={onClick}>
        {/* Always names the chain, on every route. This button has only ever
            connected the Polkadex account, and both /bridge and /faucet also
            offer a Sepolia wallet - so a bare "Connect wallet" is ambiguous
            wherever it matters. Making it route-dependent meant the header
            changed wording as you navigated, which is its own confusion. */}
        Connect Polkadex wallet
      </Button.Solid>
      <Button.Icon variant="ghost" onClick={onOpenMenu}>
        <RiMenuLine className="h-full w-full" />
      </Button.Icon>
    </div>
  );
};
