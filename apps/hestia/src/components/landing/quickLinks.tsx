import Link from "next/link";
import { Button, Typography } from "@mitra/ux";
import { RiArrowRightLine } from "@remixicon/react";

import { Icons } from "@/components/ui";

export const QuickLinks = () => {
  return (
    <section className="max-md:flex-col flex gap-10 max-w-screen-xl mx-auto w-fulll max-xl:px-2">
      <div className="flex flex-col gap-5 max-md:py-4 md:py-10 max-md:border-b md:border-r border-primary">
        <div className="flex flex-col gap-2">
          <Typography.Heading type="h4">FAQs</Typography.Heading>
          <Typography.Paragraph appearance="primary">
            Explore our Frequently Asked Questions section for in-depth guidance
            on specific features.
          </Typography.Paragraph>
        </div>
        <Link
          href="https://docs.polkadex.ee/orderbookPolkadexFAQWallets/"
          target="_blank"
        >
          <Button.Underline className="p-0 h-fit w-fit">
            Explore FAQ
            <RiArrowRightLine className="w-4 h-4 mr-4" />
          </Button.Underline>
        </Link>
      </div>
      <div className="flex flex-col max-md:py-4 gap-5 md:p-10">
        <div className="flex flex-col gap-2">
          <Typography.Heading type="h4">Join our community</Typography.Heading>
          <Typography.Paragraph appearance="primary">
            Polkadex Community connects users from 100+ countries and supports
            5+ languages.
          </Typography.Paragraph>
        </div>

        <div className="flex items-center gap-2">
          <Link href="https://discord.com/invite/Uvua83QAzk" target="_blank">
            <Button.Light appearance="tertiary">
              <Icons.Discord className="w-4 h-4 mr-4 fill-slate-600" />
              Discord
            </Button.Light>
          </Link>
          <Link href="https://t.me/Polkadex" target="_blank">
            <Button.Light appearance="secondary">
              <Icons.Telegram className="w-4 h-4 mr-4 fill-slate-600" />
              Telegram
            </Button.Light>
          </Link>
        </div>
      </div>
    </section>
  );
};
