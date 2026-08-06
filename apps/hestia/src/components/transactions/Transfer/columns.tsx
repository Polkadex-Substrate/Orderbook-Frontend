import Link from "next/link";
import { Tokens, Tooltip, Typography, truncateString } from "@mitrabook/ux";
import { createColumnHelper } from "@tanstack/react-table";
import { RiExternalLinkLine } from "@remixicon/react";

import { filters } from "./filters";

import {
  TokenCard,
  CustomTransactionDirection,
} from "@/components/ui/ReadyToUse";
import { formatedDate } from "@/helpers";

export type TransferHistoryData = {
  hash: string;
  amount: string;
  time: Date;
  fee: string;
  token: {
    name: string;
    ticker: string;
  };
  wallets: {
    fromType: string;
    fromName: string;
    fromAddress: string;
    toType: string;
    toName: string;
    toAddress: string;
  };
};

const columnHelper = createColumnHelper<TransferHistoryData>();

export const columns = () => [
  columnHelper.accessor((row) => row.time, {
    id: "date",
    cell: (e) => {
      const formattedDate = formatedDate(e.getValue());

      return (
        <Tooltip>
          <Tooltip.Trigger>
            <Typography.Text size="xs">{formattedDate}</Typography.Text>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <Typography.Text>
              <Typography.Text size="xs">
                {e.getValue().toLocaleString()}
              </Typography.Text>
            </Typography.Text>
          </Tooltip.Content>
        </Tooltip>
      );
    },
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        Date
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
  }),
  columnHelper.accessor((row) => row, {
    id: "token",
    cell: (e) => {
      const tokenTicker = e.getValue().token.ticker;
      return (
        <div className="[&_svg]:scale-[1.05]">
          <TokenCard
            tokenName={""}
            ticker={tokenTicker ?? "UNKNOWN"}
            icon={tokenTicker as keyof typeof Tokens}
          />
        </div>
      );
    },
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        Token
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
    filterFn: (row, id, value: string[]) => {
      const ticker = row
        .getValue<TransferHistoryData>(id)
        .token.ticker?.toLowerCase();
      const actualTicker = ticker === "unknown" ? "other" : ticker;
      return value?.some((val) =>
        val.toLowerCase().includes(actualTicker.toLowerCase())
      );
    },
    sortingFn: (rowA, rowB, columnId) => {
      const valA = (rowA.getValue(columnId) as TransferHistoryData).token
        .ticker;
      const valB = (rowB.getValue(columnId) as TransferHistoryData).token
        .ticker;
      return valA > valB ? 1 : -1;
    },
  }),
  columnHelper.accessor((row) => row, {
    id: "amount",
    cell: (e) => (
      <Typography.Text size="xs">{e.getValue().amount}</Typography.Text>
    ),
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        Amount
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
    sortingFn: (rowA, rowB, columnId) => {
      const valA = +(rowA.getValue(columnId) as TransferHistoryData).amount;
      const valB = +(rowB.getValue(columnId) as TransferHistoryData).amount;
      console.log(valA);
      return valA > valB ? 1 : -1;
    },
  }),
  columnHelper.accessor((row) => row.wallets, {
    id: "wallets",
    cell: (e) => {
      const showFromToolTip = e.getValue().fromType !== "Trading Account";
      const fromAddress = truncateString(e.getValue().fromAddress);
      const toAddress = truncateString(e.getValue().toAddress);
      return (
        <div className="[&_svg]:scale-90">
          <CustomTransactionDirection
            showFromToolTip={showFromToolTip}
            fromType={e.getValue().fromType}
            fromName={e.getValue().fromName}
            fromAddress={fromAddress}
            toType={e.getValue().toType}
            toName={e.getValue().toName}
            toAddress={toAddress}
          />
        </div>
      );
    },
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        From/To
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
    filterFn: (row, id, value: typeof filters.from) => {
      let title: string;
      const { toType, fromType } =
        row.getValue<TransferHistoryData["wallets"]>(id);

      if (toType === "Trading Account") {
        title = "Funding -> Trading";
      } else if (fromType === "Trading Account") {
        title = "Trading -> Funding";
      } else {
        title = "Funding -> Funding";
      }

      return value?.some((val) =>
        val.toLowerCase().includes(title.toLowerCase())
      );
    },
  }),
  columnHelper.accessor((row) => row.fee, {
    id: "fees",
    cell: (e) => (
      <Typography.Text size="xs">{e.getValue()} PDEX</Typography.Text>
    ),
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        Fee
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
  }),
  columnHelper.accessor((row) => row.hash, {
    id: "hash",
    cell: (e) => {
      const shortLink = truncateString(e.getValue(), 5);
      return (
        <Link
          href={`https://polkadex.subscan.io/extrinsic/${e.getValue()}`}
          target="_blank"
        >
          <Typography.Text
            size="xs"
            appearance="primary"
            className="flex items-center gap-1 hover:underline"
          >
            <RiExternalLinkLine className="w-3 h-3" />
            {shortLink}
          </Typography.Text>
        </Link>
      );
    },
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        Hash
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
  }),
];
