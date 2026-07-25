import { Drawer, Token, Typography, truncateString } from "@mitrabook/ux";
import { Dispatch, SetStateAction } from "react";
import { intlFormat } from "date-fns";
import Link from "next/link";
import { RiExternalLinkLine } from "@remixicon/react";

import { DepositData } from "./columns";

import {
  ResponsiveCard,
  StatusCard,
  TransactionDirection,
} from "@/components/ui/ReadyToUse";
export const ResponsiveTable = ({
  open,
  onOpenChange,
  data,
}: {
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  data: DepositData | null;
}) => {
  if (!data) return null;
  const { token, status, amount, fee, wallets, timestamp } = data;

  const fromAddress =
    wallets.fromWalletAddress &&
    truncateString(wallets.fromWalletAddress ?? "");

  const toAddress =
    wallets.toWalletAddress && truncateString(wallets.toWalletAddress ?? "");

  return (
    <Drawer
      closeOnClickOutside
      shouldScaleBackground={false}
      open={open}
      onOpenChange={onOpenChange}
    >
      <Drawer.Title className="px-4">
        {token.ticker}/{token.name}
      </Drawer.Title>
      <Drawer.Content className="flex flex-col gap-4 p-4">
        <ResponsiveCard label="Token">
          <div className="flex items-center gap-1">
            <Token name={token.ticker} size="xs" />
            <Typography.Text>{token.ticker}</Typography.Text>
          </div>
        </ResponsiveCard>
        <ResponsiveCard label="Status">
          <StatusCard status={status} />
        </ResponsiveCard>
        <ResponsiveCard label="Amount">{amount}</ResponsiveCard>
        <ResponsiveCard label="Fees">{fee}</ResponsiveCard>
        <ResponsiveCard label="From/To">
          <TransactionDirection
            tooltipable={wallets.fromWalletType === "Trading Account"}
            fromType={wallets.fromWalletType}
            fromName={wallets.fromWalletName}
            fromAddress={fromAddress}
            toAddress={toAddress}
            toType={wallets.toWalletType}
            toName={wallets.toWalletName}
          />
        </ResponsiveCard>
        {data.txType === "TRANSFER" && (
          <ResponsiveCard label="Hash">
            <div className="flex items-center gap-1.5 hover:underline">
              <RiExternalLinkLine className="w-3 h-3 text-primary" />
              <Typography.Text asChild size="sm">
                <Link
                  href={`https://polkadex.subscan.io/extrinsic/${data.stid}`}
                  target="_blank"
                >
                  {truncateString(String(data.stid))}
                </Link>
              </Typography.Text>
            </div>
          </ResponsiveCard>
        )}

        <ResponsiveCard label="Date">
          {intlFormat(
            new Date(timestamp),
            {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            },
            { locale: "EN" }
          )}
        </ResponsiveCard>
      </Drawer.Content>
    </Drawer>
  );
};
