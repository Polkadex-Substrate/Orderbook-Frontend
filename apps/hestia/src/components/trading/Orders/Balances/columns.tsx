import { createColumnHelper } from "@tanstack/react-table";
import { Typography, Token, tokenAppearance } from "@polkadex/ux";
import { AssetsProps } from "@orderbook/core/hooks";

import { ActionsCard } from "@/components/balances/Table/actionsCard";
import { AmountCard } from "@/components/ui/ReadyToUse/amountCard";

const balanceColumnHelper = createColumnHelper<AssetsProps>();

export const columns = [
  balanceColumnHelper.accessor((row) => row, {
    id: "token",
    cell: (e) => {
      const ticker = e.getValue().ticker;
      return (
        <div className="flex items-center gap-1">
          <Token
            name={ticker}
            appearance={ticker as keyof typeof tokenAppearance}
            size="xs"
            className="rounded-full border border-secondary"
          />
          <Typography.Text size="xs" className="uppercase">
            {e.getValue().ticker}
          </Typography.Text>
        </div>
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
  balanceColumnHelper.accessor((row) => row.onChainBalance, {
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
  balanceColumnHelper.accessor((row) => row.free_balance, {
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
  balanceColumnHelper.accessor((row) => row.inOrdersBalance, {
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
  balanceColumnHelper.accessor((row) => row, {
    id: "actions",
    cell: (e) => {
      return (
        <ActionsCard
          hideButton
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
    header: () => null,
    footer: (e) => e.column.id,
  }),
];
