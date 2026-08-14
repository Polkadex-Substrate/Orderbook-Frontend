"use client";

import { Fragment, forwardRef, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSettingsProvider } from "@orderbook/core/providers/public/settings";
import { Logo } from "@mitrabook/ux";
import { getMarketUrl } from "@orderbook/core/helpers";
import { defaultConfig } from "@orderbook/core/config";

import { ConnectWalletInteraction } from "../ConnectWalletInteraction";
import { ConnectTradingInteraction } from "../ConnectWalletInteraction/connectTradingInteraction";

import { HeaderLink } from "./headerLink";
import { Profile } from "./Profile";
import { ResponsiveMenuModal } from "./responsiveMenuModal";
import { NotificationsModal } from "./NotificationsModal";
import { FundWalletModal } from "./fundWalletModal";

import { EXTERNAL_LINKS } from "@/config/links";

export const Header = forwardRef<HTMLDivElement>((_, ref) => {
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const {
    fundWallet,
    connectExtension,
    onToogleConnectExtension,
    notifications: allNotifications,
    onToogleFundWallet,
  } = useSettingsProvider();
  const lastUsedMarketUrl = getMarketUrl();
  // Rewards is no longer gated on `enableLmp`. The tab is always reachable;
  // the PAGE decides what to show - the live programme when it is running, an
  // explanation of what is coming when it is not. A hidden tab told people
  // nothing and made the feature impossible to anticipate.
  const isBridgeDisabled = !defaultConfig.isBridgeEnabled;
  const isFaucetDisabled = process.env.NEXT_PUBLIC_ENABLE_FAUCET !== "true";

  const unreadNotifications = useMemo(() => {
    return allNotifications.filter((e) => e.active).length;
  }, [allNotifications]);

  return (
    <Fragment>
      <ResponsiveMenuModal open={menu} onOpenChange={setMenu} />
      <ConnectWalletInteraction />
      <ConnectTradingInteraction />
      <NotificationsModal
        open={notifications}
        onOpenChange={setNotifications}
      />
      <FundWalletModal
        open={fundWallet}
        onOpenChange={() => onToogleFundWallet()}
      />
      <header
        ref={ref}
        data-tour="header"
        className="flex justify-between items-center px-3 flex-wrap border-b border-primary sticky top-0 left-0 bg-backgroundBase z-10"
      >
        <div className="flex-1 flex items-center gap-5 py-2 overflow-auto">
          <Link
            href="/"
            className="md:flex-1 md:max-w-[140px] max-md:w-8 max-md:h-8 max-md:overflow-hidden"
          >
            <Logo.Orderbook className="max-md:pointer-events-none max-md:h-8 max-md:[&_g]:hidden" />
          </Link>
          {/* Wider gap once the links themselves grow, or they crowd. */}
          <div className="gap-5 min-[1680px]:gap-7 hidden items-center lg:!flex">
            <HeaderLink.Single href={lastUsedMarketUrl}>
              Trade
            </HeaderLink.Single>
            <HeaderLink.Single href="/bridge" disabled={isBridgeDisabled}>
              Bridge
            </HeaderLink.Single>
            <HeaderLink.Single href="/rewards">Rewards</HeaderLink.Single>
            <HeaderLink.Single href="/faucet" disabled={isFaucetDisabled}>
              Faucet
            </HeaderLink.Single>
            {/* Analytics was removed 2026-08-10, alongside Community.
                It had been promoted to a top-level link on the reasoning that
                it is a product feature - but it points at explorer.polkadex.ee,
                so it is still a link OFF this site during a trading session.
                Same test as Community: it serves the project, not the trade in
                front of the user. It lives on the explorer, where someone
                looking for analytics will go anyway. */}
            {/* Was "Support", which duplicated Discord with the Community menu.
                Help is now purely documentation. */}
            {/* "Documentation" removed 2026-08-14 until the new docs exist. A
                menu item pointing at stale documentation is worse than a
                shorter menu, and this is mirrored in responsiveMenuModal.tsx
                so the two navs agree. Restore both together. */}
            <HeaderLink.Dropdown
              items={[
                {
                  href: EXTERNAL_LINKS.testnetGuide,
                  label: "Orderbook guide",
                },
                {
                  href: "/faq",
                  label: "FAQ",
                },
              ]}
            >
              Help
            </HeaderLink.Dropdown>
            {/* The Community dropdown was removed on 2026-08-10.
                Tester feedback, and the reasoning behind acting on it: every
                link out of the orderbook during a session is a chance to lose
                the session, and Telegram/Discord/X/Reddit/Github serve the
                project rather than the trade in front of the user. They remain
                reachable from the footer and the landing page, which is where
                people look for them anyway.

                Deliberately NOT moved under a "More" menu. A catch-all is where
                links go to be forgotten, and it dodges the actual question of
                whether a link earns a place in a trading surface. Links that
                serve the trade belong at the point of need - an explorer link
                belongs in the transfer row that is stuck, not in navigation. */}
          </div>
        </div>
        {/* `hideConnect` on /bridge only.
            The bridge page offered THREE ways to connect for TWO connections:
            this app-level button, the inline Connect links in each network box,
            and the bottom primary action. A reviewer read that as redundancy and
            was right about the count. The bottom button is NOT redundant - it is
            the submit control in its pre-connection state, walking through each
            wallet and then bridging - so this is the one that goes.

            Scoped to the route deliberately. On /trading this button is the
            primary call to action and removing it globally would be a much worse
            bug than the one being fixed. */}
        <Profile
          showFundingWallet
          hideConnect={pathname?.startsWith("/bridge")}
          unreadNotifications={unreadNotifications}
          onClick={() => onToogleConnectExtension(!connectExtension)}
          onOpenMenu={() => setMenu(true)}
          onOpenNotifications={() => setNotifications(true)}
          onOpenFundWallet={() => onToogleFundWallet(true)}
        />
      </header>
    </Fragment>
  );
});

Header.displayName = "Header";
