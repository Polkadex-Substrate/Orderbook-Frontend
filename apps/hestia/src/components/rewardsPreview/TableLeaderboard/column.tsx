import { LmpLeaderboard } from "@orderbook/core/index";
import { Typography } from "@mitrabook/ux";
import { createColumnHelper } from "@tanstack/react-table";
import { trimFloat, millify } from "@aksumite/numericals";

import { AccountCard } from "./accountCard";

const columnHelper = createColumnHelper<LmpLeaderboard>();

export const columns = () => [
  columnHelper.accessor((row) => row.rank, {
    id: "id",
    cell: (e) => {
      return <Typography.Text size="xs">{e.getValue()}</Typography.Text>;
    },
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        #
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
  }),
  columnHelper.accessor((row) => row.address, {
    id: "account",
    cell: (e) => {
      return <AccountCard address={e.getValue()} />;
    },
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        Account
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
  }),
  columnHelper.accessor((row) => row.rewards, {
    id: "rewards",
    cell: (e) => {
      return (
        <Typography.Text size="xs">
          {trimFloat({
            value: e.getValue(),
            digitsAfterDecimal: 4,
          })}
        </Typography.Text>
      );
    },
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        Rewards (PDEX)
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
  }),
  columnHelper.accessor((row) => row.mmScore, {
    id: "mmScore",
    cell: (e) => {
      return (
        <Typography.Text size="xs">{millify(e.getValue())}</Typography.Text>
      );
    },
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        MM Score
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
    sortingFn: (rowA, rowB, columnId) => {
      const numA = (rowA.getValue(columnId) as LmpLeaderboard).mmScore;
      const numB = (rowB.getValue(columnId) as LmpLeaderboard).mmScore;
      return numA > numB ? 1 : -1;
    },
  }),
  columnHelper.accessor((row) => row.tradingScore, {
    id: "tradingScore",
    cell: (e) => {
      return (
        <Typography.Text size="xs">{millify(e.getValue())}</Typography.Text>
      );
    },
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        Trading Score
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
    sortingFn: (rowA, rowB, columnId) => {
      const numA = (rowA.getValue(columnId) as LmpLeaderboard).tradingScore;
      const numB = (rowB.getValue(columnId) as LmpLeaderboard).tradingScore;
      return numA > numB ? 1 : -1;
    },
  }),
];
