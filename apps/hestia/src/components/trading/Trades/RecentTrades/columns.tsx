import { Decimal } from "@orderbook/core/utils";
import { PublicTrade } from "@orderbook/core/utils/orderbookService";
import { Typography } from "@mitra/ux";
import { createColumnHelper } from "@tanstack/react-table";

const columnHelper = createColumnHelper<PublicTrade>();

export const columns = ({
  isDecreasing,
  quoteTicker,
  baseTicker,
  precision,
}: {
  isDecreasing: boolean[];
  baseTicker: string;
  quoteTicker: string;
  precision: number;
}) => [
  columnHelper.accessor((row) => row.price, {
    id: "price",
    cell: (e) => {
      const sell = isDecreasing[e.row.index];
      const priceFormatter = Decimal.format(e.getValue(), precision, ",");
      return (
        <Typography.Text size="xs" appearance={sell ? "danger" : "success"}>
          {priceFormatter}
        </Typography.Text>
      );
    },
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        Price({quoteTicker})
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
  }),
  columnHelper.accessor((row) => row.qty, {
    id: "amount",
    cell: (e) => {
      const amountFormatter = Decimal.format(e.getValue(), precision, ",");
      return (
        <Typography.Text size="xs" appearance="primary">
          {amountFormatter}
        </Typography.Text>
      );
    },
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        Amount({baseTicker})
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
  }),
  columnHelper.accessor((row) => row.timestamp, {
    id: "date",
    cell: (e) => {
      const date = new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      }).format(e.getValue());
      return <Typography.Text size="xs">{date}</Typography.Text>;
    },
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        Time
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
  }),
];
