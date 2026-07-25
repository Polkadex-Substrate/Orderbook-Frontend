import { Trade } from "@orderbook/core/utils/orderbookService/types";
import { createColumnHelper } from "@tanstack/react-table";
import { Tooltip, Typography } from "@mitra/ux";

import { formatedDate } from "@/helpers";

const tradeHistoryColumnHelper = createColumnHelper<Trade>();

export const columns = [
  tradeHistoryColumnHelper.accessor((row) => row, {
    id: "date",
    cell: (e) => {
      const date = formatedDate(e.getValue().timestamp);

      return (
        <Tooltip>
          <Tooltip.Trigger>
            <Typography.Text size="xs">{date}</Typography.Text>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <Typography.Text>
              <Typography.Text size="xs">
                {e.getValue().timestamp.toLocaleString()}
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

  tradeHistoryColumnHelper.accessor((row) => row, {
    id: "pair",
    cell: (e) => (
      <Typography.Text bold size="xs">
        {e.getValue().market.name}
      </Typography.Text>
    ),
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        Pair
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
  }),
  tradeHistoryColumnHelper.accessor((row) => row, {
    id: "type",
    cell: (e) => {
      const isSell = e.getValue().side === "Ask";

      return (
        <Typography.Text
          size="xs"
          bold
          appearance={isSell ? "danger" : "success"}
        >
          {isSell ? "Sell" : "Buy"}
        </Typography.Text>
      );
    },
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        Type
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
  }),
  tradeHistoryColumnHelper.accessor((row) => row, {
    id: "price",
    cell: (e) => {
      return (
        <Typography.Text size="xs">
          {e.getValue().price} {e.getValue().market.quoteAsset.ticker}
        </Typography.Text>
      );
    },
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        Price
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
    sortingFn: (rowA, rowB, columnId) => {
      const numA = (rowA.getValue(columnId) as Trade).price;
      const numB = (rowB.getValue(columnId) as Trade).price;
      return numA > numB ? 1 : -1;
    },
  }),
  tradeHistoryColumnHelper.accessor((row) => row, {
    id: "amount",
    cell: (e) => {
      return (
        <Typography.Text size="xs">
          {e.getValue().qty} {e.getValue().market.baseAsset.ticker}
        </Typography.Text>
      );
    },
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        Amount
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
    sortingFn: (rowA, rowB, columnId) => {
      const numA = (rowA.getValue(columnId) as Trade).qty;
      const numB = (rowB.getValue(columnId) as Trade).qty;
      return numA > numB ? 1 : -1;
    },
  }),
];
