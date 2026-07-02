"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { Typography } from "@polkadex/ux";
import { RiArrowRightLine } from "@remixicon/react";

import { NetworkCard } from "./networkCard";
import { TokenInfo } from "./tokenInfo";
import { LinkCard } from "./linkCard";
import { ClaimRefundButton } from "./claimRefundButton";

import { formatedDate } from "@/helpers";
import { Transaction } from "@/hooks";

const columnHelper = createColumnHelper<Transaction>();

export const columns = [
  columnHelper.accessor((row) => row.timestamp, {
    id: "date",
    cell: (e) => {
      const date = formatedDate(new Date(Number(e.getValue())), false);
      return (
        <Typography.Text size="sm" className="whitespace-nowrap">
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
  columnHelper.accessor((row) => row, {
    id: "token",
    cell: (e) => {
      const { symbol, amount, status } = e.getValue();
      return <TokenInfo ticker={symbol} status={status} amount={amount} />;
    },
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        Token/Amount
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
    filterFn: (row, _id, value: string[]) => {
      const ticker = row.original.symbol?.toLowerCase() ?? "";
      return value?.some((val) => val.toLowerCase().includes(ticker));
    },
    sortingFn: (rowA, rowB) => {
      const numA = parseFloat(rowA.original.amount);
      const numB = parseFloat(rowB.original.amount);
      return numA > numB ? 1 : -1;
    },
  }),
  columnHelper.accessor((row) => row, {
    id: "source",
    cell: (e) => {
      const { sourceChain, destinationChain } = e.getValue();
      return (
        <div className="flex items-center gap-3">
          <NetworkCard name={sourceChain} />
          <div className="flex items-center justify-center w-5 h-5 p-0.5 bg-level-1 border border-primary">
            <RiArrowRightLine className="w-full h-full text-primary" />
          </div>
          <NetworkCard name={destinationChain} />
        </div>
      );
    },
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        Source/Destination
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
    filterFn: (row, _id, value: string[]) =>
      value?.some((val) =>
        val
          .toLowerCase()
          .includes(row.original.sourceChain.toLowerCase() ?? ""),
      ),
  }),
  columnHelper.accessor((row) => row, {
    id: "hash",
    cell: (e) => {
      const { transactionHash, sourceChain } = e.getValue();
      return (
        <LinkCard value={transactionHash} sourceChain={sourceChain} />
      );
    },
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        Hash
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
  }),
  columnHelper.accessor((row) => row, {
    id: "action",
    cell: (e) => <ClaimRefundButton transaction={e.getValue()} />,
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        Action
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
  }),
];
