"use client";

import { Fragment, forwardRef, useMemo, useState } from "react";
import Link from "next/link";
import { useSettingsProvider } from "@orderbook/core/providers/public/settings";
import { Logo } from "@polkadex/ux";
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

const { defaultTheaSourceChain, defaultTheaDestinationChain } = defaultConfig;

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
            <HeaderLink.Single
              href={`/thea?from=${defaultTheaSourceChain}&to=${defaultTheaDestinationChain}`}
              disabled={isBridgeDisabled}
            >
              Bridge
            </HeaderLink.Single>
            <HeaderLink.Single disabled={isRewardDisabled} href="/rewards">
              Rewards
            </HeaderLink.Single>
            <HeaderLink.Dropdown
              items={[
                {
                  href: "https://discord.gg/G4KMw2sGGe",
                  label: "Community support",
                },
                {
                  href: "https://docs.polkadex.trade/orderbookPolkadexFAQHowToTradeStep1",
                  label: "Orderbook guide",
                },
                {
                  href: "https://docs.polkadex.trade/orderbookPolkadexFAQWallets",
                  label: "FAQ",
                },
              ]}
            >
              Support
            </HeaderLink.Dropdown>
            <HeaderLink.Dropdown
              items={[
                {
                  href: "https://pdexanalytics.com",
                  label: "Analytics",
                },
                {
                  href: "https://github.com/Polkadex-Substrate/Docs/blob/master/Polkadex_Terms_of_Use.pdf",
                  label: "Terms of use",
                },
                {
                  href: "https://github.com/Polkadex-Substrate/Docs/blob/master/Polkadex_Privacy_Policy.pdf",
                  label: "Privacy policy",
                },
                {
                  href: "https://github.com/Polkadex-Substrate/Docs/blob/master/Polkadex_Disclaimer_and_Legal_Notice.pdf",
                  label: "Disclaimer",
                },
                {
                  href: "https://github.com/Polkadex-Substrate/Docs/blob/master/Polkadex_Excluded_Jurisdictions.pdf",
                  label: "Excluded Jurisdictions",
                },
                {
                  href: "https://github.com/Polkadex-Substrate/Docs/blob/master/Polkadex_Data_Retention_Policy.pdf",
                  label: "Data Retention Policy",
                },
              ]}
            >
              More
            </HeaderLink.Dropdown>
            <HeaderLink.Dropdown
              items={[
                {
                  href: "https://t.me/Polkadex",
                  label: "Telegram",
                  svg: (
                    <RiTelegramFill className="bg-sky-500 rounded-full w-5 h-5" />
                  ),
                },
                {
                  href: "https://discord.com/invite/Uvua83QAzk/",
                  label: "Discord",
                  svg: (
                    <RiDiscordFill className="bg-blue-700 rounded-full w-5 h-5 p-0.5" />
                  ),
                },
                {
                  href: "https://twitter.com/polkadex",
                  label: "Twitter",
                  svg: <RiTwitterXFill className="rounded-full w-5 h-5" />,
                },
                {
                  href: "https://github.com/Polkadex-Substrate",
                  label: "Github",
                  svg: <RiGithubFill className="rounded-full w-5 h-5" />,
                },
                {
                  href: "https://www.reddit.com/r/polkadex/",
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
