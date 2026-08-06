"use client";

import { Fragment } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { Transaction } from "@orderbook/core/utils/orderbookService";
import { Tokens, Typography, truncateString } from "@polkadex/ux";
import { intlFormat } from "date-fns";
import Link from "next/link";
import { getChainFromTicker } from "@orderbook/core/helpers";
import { RiExternalLinkLine } from "@remixicon/react";

import { filters } from ".";

import {
  StatusCard,
  TokenCard,
  TransactionDirection,
} from "@/components/ui/ReadyToUse";
const formatAccount = (value: string, replaceValue = "Account") =>
  value.replace(replaceValue, "").trim();

export interface DepositData
  extends Omit<Transaction, "asset" | "timestamp" | "txType" | "stid"> {
  timestamp: Date;
  token: {
    name: string;
    ticker: string;
  };
  wallets: {
    fromWalletType: string;
    fromWalletName?: string;
    fromWalletAddress?: string;
    toWalletType: string;
    toWalletAddress?: string;
    toWalletName?: string;
  };
  stid: string | number;
  txType: "DEPOSIT" | "WITHDRAW" | "TRANSFER";
}
const columnHelper = createColumnHelper<DepositData>();

export const columns = [
  columnHelper.accessor((row) => row, {
    id: "token",
    cell: (e) => {
      const tokenTicker = e.getValue().token.ticker;
      const name = getChainFromTicker(tokenTicker);
      return (
        <TokenCard
          tokenName={name}
          ticker={tokenTicker}
          icon={tokenTicker as keyof typeof Tokens}
        />
      );
    },
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        Token
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
    filterFn: (row, id, value: string[] | string) => {
      if (typeof value === "string") {
        const rowData = row.getValue<DepositData>(id)?.token;
        const match =
          rowData?.ticker?.toLowerCase().includes(value.toLowerCase()) ||
          rowData?.name?.toLowerCase().includes(value.toLowerCase());

        return match;
      }
      return value?.some((val) =>
        val
          .toLowerCase()
          .includes(row.getValue<DepositData>(id)?.token?.ticker.toLowerCase())
      );
    },
    sortingFn: (rowA, rowB, columnId) => {
      const valA = (rowA.getValue(columnId) as DepositData).token.ticker;
      const valB = (rowB.getValue(columnId) as DepositData).token.ticker;
      return valA > valB ? -1 : 1;
    },
  }),
  columnHelper.accessor((row) => row.status, {
    id: "status",
    cell: (e) => <StatusCard status={e.getValue()} />,
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        Status
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
    filterFn: (row, id, value: typeof filters.status) =>
      value?.some((val) =>
        val
          .toLowerCase()
          .includes(row.getValue<DepositData["status"]>(id).toLowerCase())
      ),
  }),
  columnHelper.accessor((row) => row.amount, {
    id: "amount",
    cell: (e) => <Typography.Text size="sm">{e.getValue()}</Typography.Text>,
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        Amount
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
  }),
  columnHelper.accessor((row) => row, {
    id: "fees",
    cell: (e) => {
      const isTransfer = e.cell.getValue().txType === "TRANSFER";
      return isTransfer ? (
        <Typography.Text size="sm">{e.getValue().fee}</Typography.Text>
      ) : (
        <Fragment />
      );
    },
    header: (e) => {
      const isTransfer = e.table
        .getRowModel()
        .flatRows.some((e) => e.original.txType === "TRANSFER");
      return isTransfer ? (
        <Typography.Text size="xs" appearance="primary">
          Fees (PDEX)
        </Typography.Text>
      ) : (
        <Fragment />
      );
    },
    footer: (e) => e.column.id,
  }),
  columnHelper.accessor((row) => row.wallets, {
    id: "wallets",
    cell: (e) => {
      const fromAddress =
        e.getValue().fromWalletAddress &&
        truncateString(e.getValue().fromWalletAddress ?? "");

      const toAddress =
        e.getValue().toWalletAddress &&
        truncateString(e.getValue().toWalletAddress ?? "");
      return (
        <TransactionDirection
          tooltipable={e.getValue().fromWalletType === "Trading Account"}
          fromType={e.getValue().fromWalletType}
          fromName={e.getValue()?.fromWalletName}
          fromAddress={fromAddress}
          toAddress={toAddress}
          toType={e.getValue().toWalletType}
          toName={e.getValue()?.toWalletName}
        />
      );
    },
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        From/To
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
    filterFn: (row, id, value: string) => {
      const fromRowData =
        row.getValue<DepositData["wallets"]>(id).fromWalletType;
      const toRowData = row.getValue<DepositData["wallets"]>(id).toWalletType;
      const compareValue = `${formatAccount(fromRowData)}/${formatAccount(toRowData)}}`;
      return compareValue.includes(value); // TODO: check trading/funding
    },
  }),
  columnHelper.accessor((row) => row, {
    id: "txid",
    cell: (e) => {
      const isTransfer = e.cell.getValue().txType === "TRANSFER";
      const value = e.getValue().stid.toString();
      return isTransfer ? (
        <div className="flex items-center gap-1.5 hover:underline">
          <RiExternalLinkLine className="w-3 h-3 text-primary" />
          <Typography.Text asChild size="sm">
            <Link
              href={`https://polkadex.subscan.io/extrinsic/${value}`}
              target="_blank"
            >
              {truncateString(value)}
            </Link>
          </Typography.Text>
        </div>
      ) : (
        <Fragment />
      );
    },
    header: (e) => {
      const isTransfer = e.table
        .getRowModel()
        .flatRows.some((e) => e.original.txType === "TRANSFER");
      return isTransfer ? (
        <Typography.Text size="xs" appearance="primary">
          Hash
        </Typography.Text>
      ) : (
        <Fragment />
      );
    },
    footer: (e) => e.column.id,
  }),
  columnHelper.accessor((row) => row.timestamp, {
    id: "date",
    cell: (e) => (
      <Typography.Text size="sm">
        {intlFormat(
          new Date(e.getValue()),
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
    ),
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        Date
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
  }),
];
