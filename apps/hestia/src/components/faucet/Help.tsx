"use client";

import { Button, Typography } from "@mitra/ux";
import {
  RiDropLine,
  RiFeedbackLine,
  RiExternalLinkLine,
} from "@remixicon/react";
import Link from "next/link";
import { forwardRef } from "react";

const HelpCard = ({
  title,
  description,
  href,
  children,
}: {
  title: string;
  description: string;
  href: string;
  children: React.ReactNode;
}) => (
  <Link href={href} target="_blank" className="w-full">
    <div className="flex-1 w-full max-md:first:border-b md:h-full flex items-center px-2 py-6 h-fit gap-4 border-secondary-base">
      {children}
      <div className="flex flex-col gap-2 max-w-[25rem]">
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <Typography.Text size="base" className="font-medium leading-normal">
              {title}
            </Typography.Text>
            <RiExternalLinkLine className="w-4 h-4 opacity-50" />
          </div>
          <Typography.Paragraph appearance="primary" size="sm">
            {description}
          </Typography.Paragraph>
        </div>
      </div>
    </div>
  </Link>
);

export const Help = forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <div
      ref={ref}
      className="flex items-start max-md:flex-col max-md:gap-4 max-w-[900px] flex-1 mx-auto w-full mt-20 max-lg:pb-4"
    >
      <HelpCard
        title="How to use the Faucet"
        description="Learn how to request testnet tokens for development."
        href="https://docs.polkadex.ee"
      >
        <Button.Icon
          size="2sm"
          appearance="secondary"
          className="rounded-md bg-secondary-base pointer-events-none"
        >
          <RiDropLine className="w-full h-full" />
        </Button.Icon>
      </HelpCard>
      <HelpCard
        title="Having Trouble?"
        description="Feel free to reach out to our community for support."
        href="https://discord.gg/G4KMw2sGGe"
      >
        <Button.Icon
          size="2sm"
          appearance="secondary"
          className="rounded-md bg-secondary-base pointer-events-none"
        >
          <RiFeedbackLine className="w-full h-full" />
        </Button.Icon>
      </HelpCard>
    </div>
  );
});

Help.displayName = "Help";
