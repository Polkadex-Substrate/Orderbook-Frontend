"use client";

import { Fragment, forwardRef, useMemo, useState } from "react";
import Link from "next/link";
import { useSettingsProvider } from "@orderbook/core/providers/public/settings";
import { Logo } from "@mitrabook/ux";
import { getMarketUrl } from "@orderbook/core/helpers";
import { defaultConfig } from "@orderbook/core/config";
import {
  RiRedditFill,
  RiTelegramFill,
  RiGithubFill,
  RiTwitterXFill,
  RiDiscordFill,
} from "@remixicon/react";

import { ConnectWalletInteraction } from "../ConnectWalletInteraction";
import { ConnectTradingInteraction } from "../ConnectWalletInteraction/connectTradingInteraction";

import { HeaderLink } from "./headerLink";
import { Profile } from "./Profile";
import { ResponsiveMenuModal } from "./responsiveMenuModal";
import { NotificationsModal } from "./NotificationsModal";
import { FundWalletModal } from "./fundWalletModal";

import { EXTERNAL_LINKS } from "@/config/links";

export const Header = forwardRef<HTMLDivElement>((_, ref) => {
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
  const isRewardDisabled = !defaultConfig.enableLmp;
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
          <div className="gap-5 hidden items-center lg:!flex">
            <HeaderLink.Single href={lastUsedMarketUrl}>
              Trade
            </HeaderLink.Single>
            <HeaderLink.Single href="/bridge" disabled={isBridgeDisabled}>
              Bridge
            </HeaderLink.Single>
            <HeaderLink.Single disabled={isRewardDisabled} href="/rewards">
              Rewards
            </HeaderLink.Single>
            <HeaderLink.Single href="/faucet" disabled={isFaucetDisabled}>
              Faucet
            </HeaderLink.Single>
            <HeaderLink.Dropdown
              items={[
                {
                  href: EXTERNAL_LINKS.discord,
                  label: "Community support",
                },
                {
                  href: "https://polkadex.ee/testnet-guide",
                  label: "Orderbook guide",
                },
                {
                  href: "https://docs.polkadex.ee/orderbookPolkadexFAQWallets",
                  label: "FAQ",
                },
              ]}
            >
              Support
            </HeaderLink.Dropdown>
            <HeaderLink.Dropdown
              items={[
                {
                  href: "https://explorer.polkadex.ee/analytics",
                  label: "Analytics",
                },
                {
                  href: "/legal/terms",
                  label: "Terms of use",
                },
                {
                  href: "/legal/privacy",
                  label: "Privacy policy",
                },
                {
                  href: "/legal/disclaimer",
                  label: "Disclaimer",
                },
                {
                  href: "/legal/excluded-jurisdictions",
                  label: "Excluded Jurisdictions",
                },
                {
                  href: "/legal/data-retention",
                  label: "Data Retention Policy",
                },
              ]}
            >
              More
            </HeaderLink.Dropdown>
            <HeaderLink.Dropdown
              items={[
                {
                  href: EXTERNAL_LINKS.telegram,
                  label: "Telegram",
                  svg: (
                    <RiTelegramFill className="bg-sky-500 rounded-full w-5 h-5" />
                  ),
                },
                {
                  href: EXTERNAL_LINKS.discord,
                  label: "Discord",
                  svg: (
                    <RiDiscordFill className="bg-blue-700 rounded-full w-5 h-5 p-0.5" />
                  ),
                },
                {
                  href: EXTERNAL_LINKS.twitter,
                  label: "X",
                  svg: <RiTwitterXFill className="rounded-full w-5 h-5" />,
                },
                {
                  href: EXTERNAL_LINKS.github,
                  label: "Github",
                  svg: <RiGithubFill className="rounded-full w-5 h-5" />,
                },
                {
                  href: EXTERNAL_LINKS.reddit,
                  label: "Reddit",
                  svg: (
                    <RiRedditFill className="bg-red-500 rounded-full w-5 h-5" />
                  ),
                },
              ]}
            >
              Community
            </HeaderLink.Dropdown>
          </div>
        </div>
        <Profile
          showFundingWallet
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
