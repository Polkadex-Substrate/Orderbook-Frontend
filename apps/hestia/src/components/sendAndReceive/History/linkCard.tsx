import { truncateString, Typography } from "@polkadex/ux";
import { RiExternalLinkLine } from "@remixicon/react";
import Link from "next/link";
import React from "react";

export const LinkCard = ({ value = "" }: { value?: string }) => {
  const shortData = truncateString(value);
  const href = `https://polkadex.subscan.io/block/${value}`;
  return (
    <Link target="_blank" rel="noopener noreferrer" href={href}>
      <div className="flex items-center gap-1">
        <RiExternalLinkLine className="w-3.5 h-3.5 text-actionInput" />
        <Typography.Text appearance="primary" size="sm">
          {shortData}
        </Typography.Text>
      </div>
    </Link>
  );
};
