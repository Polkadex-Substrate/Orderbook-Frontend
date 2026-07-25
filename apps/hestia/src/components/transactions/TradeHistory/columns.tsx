import { Trade } from "@orderbook/core/utils/orderbookService/types";
import { createColumnHelper } from "@tanstack/react-table";
import { Copy, Tooltip, Typography, truncateString } from "@mitra/ux";
import { RiFileCopyLine } from "@remixicon/react";

import { filters } from "./filters";

import { formatedDate } from "@/helpers";

const columnHelper = createColumnHelper<Trade>();

export const columns = () => [
  columnHelper.accessor((row) => row, {
    id: "id",
    cell: (e) => {
      return (
        <Copy value={e.getValue().tradeId}>
          <div className="flex items-center gap-2">
            <RiFileCopyLine className="w-3.5 h-3.5 text-actionInput" />
            <Typography.Text size="xs">
              {truncateString(e.getValue().tradeId, 4)}
            </Typography.Text>
          </div>
        </Copy>
      );
    },
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        ID
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
  }),
  columnHelper.accessor((row) => row, {
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

  columnHelper.accessor((row) => row, {
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
    filterFn: (row, id, value: string[]) =>
      value?.some((val) =>
        val
          .toLowerCase()
          .includes(row.getValue<Trade>(id).market.name.toLowerCase())
      ),
  }),
  columnHelper.accessor((row) => row, {
    id: "type",
    cell: (e) => {
      const isSell = e.getValue().side === "Ask";

      return (
        <Typography.Text
          size="xs"
          bold
          appearance={isSell ? "danger" : "success"}
          className="uppercase"
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
    filterFn: (row, id, value: typeof filters.type) => {
      const isSell = row.getValue<Trade>(id).side === "Ask";
      const title = isSell ? "Sell" : "Buy";
      return value?.some((val) =>
        val.toLowerCase().includes(title.toLowerCase())
      );
    },
  }),
  columnHelper.accessor((row) => row, {
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
  columnHelper.accessor((row) => row, {
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
