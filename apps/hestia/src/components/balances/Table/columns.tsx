import { createColumnHelper } from "@tanstack/react-table";
import { AssetsProps } from "@orderbook/core/hooks";
import { Tokens, Typography } from "@polkadex/ux";
import { Fragment } from "react";

import { ActionsCard } from "./actionsCard";

import { TokenCard } from "@/components/ui/ReadyToUse";
import { AmountCard } from "@/components/ui/ReadyToUse/amountCard";

const columnHelper = createColumnHelper<AssetsProps>();
export const columns = [
  columnHelper.accessor((row) => row, {
    id: "token",
    cell: (e) => {
      return (
        <TokenCard
          tokenName={e.getValue().name}
          ticker={e.getValue().ticker}
          icon={e.getValue().ticker as keyof typeof Tokens}
        />
      );
    },
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        Asset
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
    sortingFn: (rowA, rowB, columnId) => {
      const valA = (rowA.getValue(columnId) as AssetsProps).ticker;
      const valB = (rowB.getValue(columnId) as AssetsProps).ticker;
      return valA > valB ? 1 : -1;
    },
  }),
  columnHelper.accessor((row) => row.onChainBalance, {
    id: "fundingAccount",
    cell: (e) => <AmountCard>{e.getValue()}</AmountCard>,
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        Funding account
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
    sortingFn: (rowA, rowB, columnId) => {
      const valA = Number(rowA.getValue(columnId));
      const valB = Number(rowB.getValue(columnId));
      return valA > valB ? 1 : -1;
    },
  }),
  columnHelper.accessor((row) => row.free_balance, {
    id: "tradingAccount",
    cell: (e) => <AmountCard>{e.getValue()}</AmountCard>,
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        Trading account
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
    sortingFn: (rowA, rowB, columnId) => {
      const valA = Number(rowA.getValue(columnId));
      const valB = Number(rowB.getValue(columnId));
      return valA > valB ? 1 : -1;
    },
  }),
  columnHelper.accessor((row) => row.inOrdersBalance, {
    id: "inOrders",
    cell: (e) => <AmountCard>{e.getValue()}</AmountCard>,
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        In orders
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
    sortingFn: (rowA, rowB, columnId) => {
      const valA = Number(rowA.getValue(columnId));
      const valB = Number(rowB.getValue(columnId));
      return valA > valB ? 1 : -1;
    },
  }),
  columnHelper.accessor((row) => row, {
    id: "actions",
    cell: (e) => {
      return (
        <ActionsCard
          withdrawLink={{
            pathname: "/send-and-receive",
            query: {
              type: "withdraw",
            },
          }}
          depositLink={{
            pathname: "/send-and-receive",
          }}
          tradeLink={`/trading/${e.getValue().ticker}`}
          transferLink={{
            pathname: `/transfer/${e.getValue().ticker}`,
            query: { type: "transfer" },
          }}
        />
      );
    },
    header: () => <Fragment />,
    footer: (e) => e.column.id,
  }),
];
