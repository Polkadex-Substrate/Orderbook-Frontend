import { Logo, Typography } from "@polkadex/ux";
import Link from "next/link";
import React from "react";

import { Icons } from "@/components/ui";

export const Footer = () => {
  return (
    <footer className="max-w-screen-2xl max-2xl:px-2 mx-auto w-full border-t border-primary">
      <div className="flex flex-wrap gap-10 justify-between py-10">
        <Logo.Orderbook className="min-w-[150px] h-7 flex-1" />
        {data.map((value) => (
          <div key={value.title} className="flex-1 flex flex-col gap-4">
            <Typography.Heading type="h4" size="md">
              {value.title}
            </Typography.Heading>
            <div className="flex flex-col gap-3">
              {value.links.map((val) => (
                <Typography.Text
                  key={val.title}
                  appearance="primary"
                  className="hover:text-current duration-300 transition-colors whitespace-nowrap"
                >
                  <Link href={val.href} target={val.target}>
                    {val.title}
                  </Link>
                </Typography.Text>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="max-md:flex-col gap-3 flex md:items-center justify-between py-5 border-t border-primary">
        <div className="max-md:flex-1 flex items-center max-md:justify-between gap-4">
          <Typography.Text>Copyright ©2024 Polkadex Inc.</Typography.Text>
          <Typography.Text
            appearance="primary"
            className="hover:text-current duration-300 transition-colors"
          >
            <Link
              href="https://github.com/Polkadex-Substrate/Docs/blob/master/Polkadex_Terms_of_Use.pdf"
              target="_blank"
            >
              Terms and conditions
            </Link>
          </Typography.Text>
          <Typography.Text
            appearance="primary"
            className="hover:text-current duration-300 transition-colors"
          >
            <Link
              href="https://github.com/Polkadex-Substrate/Docs/blob/master/Polkadex_Privacy_Policy.pdf"
              target="_blank"
            >
              Privacy policy
            </Link>
          </Typography.Text>
        </div>
        <div className="flex items-center gap-2">
          {socialMedia.map((val) => {
            const IconCompontent = Icons[val.iconName as keyof typeof Icons];

            return (
              <Link
                target={val.target}
                href={val.href}
                key={val.iconName}
                className="grid place-content-center w-7 h-7"
              >
                <IconCompontent className="w-4 h-4 fill-white" />
              </Link>
            );
          })}
        </div>
      </div>
    </footer>
  );
};

const data = [
  {
    title: "About us",
    links: [
      {
        title: "Overview",
        href: "https://docs.polkadex.trade/",
        target: "_blank",
      },
      {
        title: "Roadmap",
        href: "https://polkadex.trade/roadmap",
        target: "_blank",
      },
      {
        title: "Token economics",
        href: "https://polkadex.trade/tokeneconomics",
        target: "_blank",
      },
    ],
  },
  {
    title: "Products",
    links: [
      {
        title: "Orderbook",
        href: "https://orderbook.polkadex.trade",
        target: "_blank",
      },
      {
        title: "THEA Crosschain",
        href: "https://orderbook.polkadex.trade/thea",
        target: "_blank",
      },
    ],
  },
  {
    title: "Resources",
    links: [
      {
        title: "Github Repository",
        href: "https://github.com/Polkadex-Substrate",
        target: "_blank",
      },
      {
        title: "Tutorials",
        href: "https://www.youtube.com/channel/UC6fXRDT4lLKlXG3gP0PP06Q",
        target: "_blank",
      },
      {
        title: "Substrate",
        href: "https://www.substrate.io/",
        target: "_blank",
      },
    ],
  },
  {
    title: "Support",
    links: [
      {
        title: "Help center",
        href: "https://discord.com/invite/Uvua83QAzk",
        target: "_blank",
      },
      {
        title: "Report issues",
        href: "https://t.me/Polkadex",
        target: "_blank",
      },
      {
        title: "Beginner's guide",
        href: "https://docs.polkadex.trade/orderbookPolkadexFAQWallets",
        target: "_blank",
      },
    ],
  },
];

const socialMedia = [
  {
    alt: "Twitter logo",
    iconName: "Twitter",
    href: "https://twitter.com/polkadex",
    target: "_blank",
  },
  {
    alt: "Telegram logo",
    iconName: "Telegram",
    href: "https://t.me/Polkadex",
    target: "_blank",
  },
  {
    alt: "Medium logo",
    iconName: "Medium",
    href: "https://polkadex.medium.com/",
    target: "_blank",
  },
  {
    alt: "Reddit logo",
    iconName: "Reddit",
    href: "https://www.reddit.com/r/polkadex",
    target: "_blank",
  },
  {
    alt: "Discord logo",
    iconName: "Discord",
    href: "https://discord.com/invite/Uvua83QAzk/",
    target: "_blank",
  },
];
