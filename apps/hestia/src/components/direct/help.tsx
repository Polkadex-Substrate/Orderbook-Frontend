"use client";

import { Typography } from "@mitrabook/ux";
import { forwardRef } from "react";
import { RiExternalLinkLine } from "@remixicon/react";
import Link from "next/link";

export const Help = forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <div
      ref={ref}
      className="flex items-start max-md:flex-col max-md:gap-4 w-full max-lg:pb-4 border-t border-primary p-4 hover:bg-level-0 transition-colors duration-300"
    >
      <Link
        href="https://discord.gg/QNfwPevNG"
        target="_blank"
        className="w-full flex items-center justify-between"
      >
        <div className="flex flex-col">
          <Typography.Text size="base" className="font-medium leading-normal">
            Having Trouble?
          </Typography.Text>
          <Typography.Paragraph appearance="primary" size="sm">
            Feel free to get in touch.
          </Typography.Paragraph>
        </div>
        <RiExternalLinkLine className="w-4 h-4 opacity-50" />
      </Link>
    </div>
  );
});
Help.displayName = "Help";
