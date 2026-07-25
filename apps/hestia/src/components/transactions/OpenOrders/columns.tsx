import {
  MarketBase,
  Order,
} from "@orderbook/core/utils/orderbookService/types";
import { createColumnHelper } from "@tanstack/react-table";
import { Copy, Tooltip, Typography, truncateString } from "@mitra/ux";
import { CancelOrderArgs } from "@orderbook/core/hooks";
import { RiFileCopyLine } from "@remixicon/react";

import { filters } from "./filters";
import { CancelOrderAction } from "./cancelOrderAction";

import { FilledCard } from "@/components/ui/ReadyToUse";
import { formatedDate } from "@/helpers";
import { CancelAllOrdersAction } from "@/components/ui/ReadyToUse/cancelAllOrdersAction";

const columnHelper = createColumnHelper<Order>();

export const columns = ({
  onCancelOrder,
  onCancelAllOrders,
  markets,
}: {
  onCancelOrder: (value: CancelOrderArgs) => Promise<void>;
  onCancelAllOrders: (props: { market: string }) => Promise<void>;
  markets: MarketBase[];
}) => [
  columnHelper.accessor((row) => row, {
    id: "id",
    cell: (e) => (
      <Copy value={e.getValue().orderId}>
        <div className="flex items-center gap-2">
          <RiFileCopyLine className="w-3.5 h-3.5 text-actionInput" />
          <Typography.Text size="xs">
            {truncateString(e.getValue().orderId, 4)}
          </Typography.Text>
        </div>
      </Copy>
    ),
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
          .includes(row.getValue<Order>(id).market.name.toLowerCase())
      ),
  }),
  columnHelper.accessor((row) => row, {
    id: "type",
    cell: (e) => {
      const isSell = e.getValue().side === "Ask";
      const title = `${e.getValue().type}/${isSell ? "Sell" : "Buy"}`;
      return (
        <Typography.Text
          size="xs"
          bold
          appearance={isSell ? "danger" : "success"}
          className="uppercase"
        >
          {title}
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
      const isSell = row.getValue<Order>(id).side === "Ask";
      const title = `${row.getValue<Order>(id).type}/${isSell ? "Sell" : "Buy"}`;
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
      const numA = (rowA.getValue(columnId) as Order).price;
      const numB = (rowB.getValue(columnId) as Order).price;
      return numA > numB ? 1 : -1;
    },
  }),
  columnHelper.accessor((row) => row, {
    id: "amount",
    cell: (e) => {
      return (
        <Typography.Text size="xs">
          {e.getValue().quantity} {e.getValue().market.baseAsset.ticker}
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
      const numA = +(rowA.getValue(columnId) as Order).quantity;
      const numB = +(rowB.getValue(columnId) as Order).quantity;
      return numA > numB ? 1 : -1;
    },
  }),
  columnHelper.accessor((row) => row, {
    id: "filled",
    cell: (e) => {
      const percent =
        (Number(e.getValue().filledQuantity) / Number(e.getValue().quantity)) *
        100;

      const roundedPercent = Math.min(100, percent).toFixed(2);
      const width = `${roundedPercent}%`;
      return (
        <div style={{ width: "75%" }}>
          <FilledCard width={width}>
            {e.getValue().filledQuantity} {e.getValue().market.baseAsset.ticker}
          </FilledCard>
        </div>
      );
    },
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        Filled
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
  }),
  columnHelper.accessor((row) => row, {
    id: "actions",
    cell: (e) => {
      return (
        <CancelOrderAction
          onCancel={async () =>
            await onCancelOrder({
              orderId: e.getValue().orderId,
              base: e.getValue().market.baseAsset.id,
              quote: e.getValue().market.quoteAsset.id,
            })
          }
        />
      );
    },
    header: () => (
      <CancelAllOrdersAction
        markets={markets}
        onCancel={async (market) => await onCancelAllOrders({ market })}
      />
    ),
    footer: (e) => e.column.id,
  }),
];
