import { parseScientific } from "@polkadex/numericals";
import { Order } from "@orderbook/core/utils/orderbookService/types";
import { createColumnHelper } from "@tanstack/react-table";
import { HoverCard, Tooltip, Typography } from "@polkadex/ux";

import { formatedDate } from "@/helpers";
import { FilledCard } from "@/components/ui/ReadyToUse";

const orderHistoryColumnHelper = createColumnHelper<Order>();

export const columns = [
  orderHistoryColumnHelper.accessor((row) => row, {
    id: "date",
    cell: (e) => {
      const date = formatedDate(e.getValue().timestamp);
      const status = e.getValue().status;
      return (
        <div className="flex flex-col items-start">
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
          <div className="flex items-center">
            <Typography.Text
              appearance="primary"
              size="xs"
              className="first-letter:uppercase"
            >
              {status.toLowerCase()}
            </Typography.Text>
          </div>
        </div>
      );
    },
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        Date
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
  }),

  orderHistoryColumnHelper.accessor((row) => row, {
    id: "pair",
    cell: (e) => {
      const isSell = e.getValue().side === "Ask";

      return (
        <div className="flex flex-col">
          <Typography.Text bold size="xs">
            {e.getValue().market.name}
          </Typography.Text>
          <div className="flex items-center">
            <Typography.Text
              size="xs"
              className="first-letter:uppercase"
              bold
              appearance={isSell ? "danger" : "success"}
            >
              {e.getValue().type.toLowerCase()} / {isSell ? "Sell" : "Buy"}
            </Typography.Text>
          </div>
        </div>
      );
    },
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        Pair/Type
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
  }),

  orderHistoryColumnHelper.accessor((row) => row, {
    id: "price",
    cell: (e) => {
      const isMarket = e.getValue().type === "MARKET";
      return (
        <Typography.Text size="xs">
          {isMarket
            ? "---"
            : `${e.getValue().price} ${e.getValue().market.quoteAsset.ticker}`}
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
  orderHistoryColumnHelper.accessor((row) => row, {
    id: "amount",
    cell: (e) => {
      const { side, type, quantity, market } = e.getValue();
      const isMarketBuy = type === "MARKET" && side === "Bid";
      return (
        <Typography.Text size="xs">
          {parseScientific((+quantity).toString())}{" "}
          {isMarketBuy ? market.quoteAsset.ticker : market.baseAsset.ticker}
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
  orderHistoryColumnHelper.accessor((row) => row, {
    id: "filled",
    cell: (e) => {
      const percent =
        (Number(e.getValue().filledQuantity) / Number(e.getValue().quantity)) *
        100;

      const roundedPercent = Math.min(100, percent).toFixed(2);
      const width = `${roundedPercent}%`;
      return (
        <HoverCard closeDelay={10}>
          <HoverCard.Trigger>
            <FilledCard width={width}>
              {parseScientific((+e.getValue().filledQuantity).toString())}{" "}
              {e.getValue().market.baseAsset.ticker}
            </FilledCard>
          </HoverCard.Trigger>
          <HoverCard.Content
            className="flex items-center gap-2"
            sideOffset={2}
            side="top"
          >
            <Typography.Text appearance="primary">Avg Price:</Typography.Text>
            <Typography.Text>
              {e.getValue().averagePrice}{" "}
              {e.getValue().market.quoteAsset.ticker}
            </Typography.Text>
          </HoverCard.Content>
        </HoverCard>
      );
    },
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        Filled
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
  }),
  orderHistoryColumnHelper.accessor((row) => row, {
    id: "fee",
    cell: (e) => {
      const ticker =
        e.getValue().side === "Bid"
          ? e.getValue().market.baseAsset.ticker
          : e.getValue().market.quoteAsset.ticker;
      return (
        <Typography.Text size="xs" className="whitespace-nowrap">
          {parseScientific(e.getValue().fee.toString())} {ticker}
        </Typography.Text>
      );
    },
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        Fee
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
    sortingFn: (rowA, rowB, columnId) => {
      const numA = (rowA.getValue(columnId) as Order).fee;
      const numB = (rowB.getValue(columnId) as Order).fee;
      return numA > numB ? 1 : -1;
    },
  }),
];
