import { Dispatch, SetStateAction } from "react";
import { Drawer, Token, Typography, truncateString } from "@mitrabook/ux";
import { intlFormat } from "date-fns";
import Link from "next/link";
import { RiExternalLinkLine } from "@remixicon/react";

import { TransferHistoryData } from "./columns";

import {
  CustomTransactionDirection,
  ResponsiveCard,
} from "@/components/ui/ReadyToUse";

const ResponsiveTable = ({
  open,
  onOpenChange,
  data,
}: {
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  data: TransferHistoryData | null;
}) => {
  if (!data) return null;
  const { amount, fee, hash, time, token, wallets } = data;
  const showFromToolTip = wallets.fromType !== "Trading Account";
  const fromAddress = truncateString(wallets.fromAddress);
  const toAddress = truncateString(wallets.toAddress);
  const shortLink = truncateString(hash, 10);
  return (
    <Drawer
      closeOnClickOutside
      shouldScaleBackground={false}
      open={open}
      onOpenChange={onOpenChange}
    >
      <Drawer.Title className="px-4">
        <Typography.Heading size="base">Transfer</Typography.Heading>
      </Drawer.Title>
      <Drawer.Content className="flex flex-col gap-4 p-4">
        <ResponsiveCard label="Date">
          <Typography.Text size="xs">
            {intlFormat(
              time,
              {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              },
              { locale: "EN" }
            )}
          </Typography.Text>
        </ResponsiveCard>
        <ResponsiveCard label="Token">
          <div className="flex items-center gap-1">
            <Token name={token.ticker} size="xs" />
            <Typography.Text size="xs">
              {token.ticker ?? "Unknown"}
            </Typography.Text>
          </div>
        </ResponsiveCard>
        <ResponsiveCard label="Amount">
          <Typography.Text size="xs">{amount}</Typography.Text>
        </ResponsiveCard>
        <ResponsiveCard label="From/To">
          <CustomTransactionDirection
            showFromToolTip={showFromToolTip}
            fromType={wallets.fromType}
            fromName={wallets.fromName}
            fromAddress={fromAddress}
            toType={wallets.toType}
            toName={wallets.toName}
            toAddress={toAddress}
          />
        </ResponsiveCard>
        <ResponsiveCard label="Fees">
          <Typography.Text size="xs">{fee} PDEX</Typography.Text>
        </ResponsiveCard>
        <ResponsiveCard label="Hash">
          <Link
            href={`https://polkadex.subscan.io/extrinsic/${hash}`}
            target="_blank"
          >
            <Typography.Text
              size="sm"
              appearance="primary"
              className="flex items-center gap-1 hover:underline"
            >
              <RiExternalLinkLine className="w-3 h-3" />
              {shortLink}
            </Typography.Text>
          </Link>
        </ResponsiveCard>
      </Drawer.Content>
    </Drawer>
  );
};

export default ResponsiveTable;
