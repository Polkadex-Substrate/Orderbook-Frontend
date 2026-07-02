import { truncateString, Typography } from "@polkadex/ux";
import { RiExternalLinkLine } from "@remixicon/react";
import Link from "next/link";
import React from "react";

function getExplorerHref(value: string, sourceChain: string): string {
  if (sourceChain.toLowerCase().includes("polkadex")) {
    return `https://polkadex.subscan.io/block/${value}`;
  }
  // EVM transaction hash (0x...)
  return `https://sepolia.etherscan.io/tx/${value}`;
}

export const LinkCard = ({
  value = "",
  sourceChain = "",
}: {
  value?: string;
  sourceChain?: string;
}) => {
  const shortData = truncateString(value);
  const href = getExplorerHref(value, sourceChain);
  return (
    <Link target="_blank" href={href}>
      <div className="flex items-center gap-1">
        <RiExternalLinkLine className="w-3.5 h-3.5 text-actionInput" />
        <Typography.Text appearance="primary" size="sm">
          {shortData}
        </Typography.Text>
      </div>
    </Link>
  );
};
