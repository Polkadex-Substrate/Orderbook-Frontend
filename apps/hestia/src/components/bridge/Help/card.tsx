import { Typography } from "@polkadex/ux";
import { RiExternalLinkLine } from "@remixicon/react";
import Link from "next/link";
import { HTMLAttributeAnchorTarget, PropsWithChildren } from "react";

export const Card = ({
  description,
  title,
  href,
  target,
  children,
}: PropsWithChildren<{
  description?: string;
  title: string;
  href: string;
  target?: HTMLAttributeAnchorTarget;
}>) => {
  return (
    <Link href={href} target={target} className="w-full">
      <div className="flex-1 w-full max-md:first:border-b md:h-full flex items-center px-2 py-6 h-fit gap-4 border-secondary-base">
        {children}
        <div className="flex flex-col gap-2 max-w-[25rem]">
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <Typography.Text
                size="base"
                className="font-medium leading-normal"
              >
                {title}
              </Typography.Text>
              <RiExternalLinkLine className="w-4 h-4 opacity-50" />
            </div>
            {description && (
              <Typography.Paragraph appearance="primary" size="sm">
                {description}
              </Typography.Paragraph>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};
