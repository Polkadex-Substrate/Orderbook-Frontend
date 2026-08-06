"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { Typography } from "@polkadex/ux";

import { TokenInfo } from "./tokenInfo";
import { LinkCard } from "./linkCard";

import { formatedDate } from "@/helpers";
import { Transaction } from "@/hooks";

const columnHelper = createColumnHelper<Transaction>();

export const columns = [
  columnHelper.accessor((row) => row, {
    id: "token",
    cell: (e) => {
      const { asset, amount, status } = e.getValue();
      const value = amount.toFormat();
      const ready = ["CLAIMED", "APPROVED", "READY"].includes(status);

      return <TokenInfo ticker={asset?.ticker} ready={ready} amount={value} />;
    },
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        Token/Amount
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
    filterFn: (row, id, value: string[]) => {
      const ticker = row.original.asset?.ticker?.toLowerCase() ?? "";
      return value?.some((val) => val.toLowerCase() === ticker);
    },

    sortingFn: (rowA, rowB) => {
      const numA = rowA.original.amount;
      const numB = rowB.original.amount;
      return numA > numB ? 1 : numA < numB ? -1 : 0;
    },
  }),
  columnHelper.accessor((row) => row.hash, {
    id: "hash",
    cell: (e) => {
      const data = e.getValue();

      return <LinkCard value={data} />;
    },
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        Hash
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
  }),
  columnHelper.accessor((row) => row.timestamp, {
    id: "date",
    cell: (e) => {
      const date = formatedDate(new Date(e.getValue()), false);
      return (
        <Typography.Text size="sm" className=" whitespace-nowrap">
          {date}
        </Typography.Text>
      );
    },
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        Date
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
  }),
];
