import { LmpMarketConfig } from "@orderbook/core/index";
import { Tokens, Typography } from "@mitra/ux";
import { millify } from "@mitra/numericals";
import { createColumnHelper } from "@tanstack/react-table";

import { MarketCard } from "./marketCard";

const columnHelper = createColumnHelper<LmpMarketConfig>();

export const columns = () => [
  columnHelper.accessor((row) => row, {
    id: "market",
    cell: (e) => {
      const baseTicker = e.getValue().baseAsset?.ticker || "Unknown";
      const quoteTicker = e.getValue().quoteAsset?.ticker || "Unknown";
      return (
        <MarketCard
          marketName={`${baseTicker}/${quoteTicker}`}
          icon={baseTicker as keyof typeof Tokens}
          pairIcon={quoteTicker as keyof typeof Tokens}
        />
      );
    },
    header: () => (
      <Typography.Text size="xs" appearance="primary" className="ml-2">
        Market
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
  }),
  columnHelper.accessor((row) => row, {
    id: "makerScore",
    cell: (e) => {
      return (
        <Typography.Text size="sm">
          {millify(e.getValue().makerScore)}
        </Typography.Text>
      );
    },
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        Market Making Score
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
    sortingFn: (rowA, rowB, columnId) => {
      const numA = (rowA.getValue(columnId) as LmpMarketConfig).makerScore;
      const numB = (rowB.getValue(columnId) as LmpMarketConfig).makerScore;
      return numA > numB ? 1 : -1;
    },
  }),
  columnHelper.accessor((row) => row, {
    id: "traderScore",
    cell: (e) => {
      return (
        <Typography.Text size="sm">
          {millify(e.getValue().traderScore)}
        </Typography.Text>
      );
    },
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        Trading Score
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
    sortingFn: (rowA, rowB, columnId) => {
      const numA = (rowA.getValue(columnId) as LmpMarketConfig).traderScore;
      const numB = (rowB.getValue(columnId) as LmpMarketConfig).traderScore;
      return numA > numB ? 1 : -1;
    },
  }),
  columnHelper.accessor((row) => row, {
    id: "volume24h",
    cell: (e) => {
      return (
        <Typography.Text size="sm">
          {e.getValue().quoteVolume24h.toFixed(4)}{" "}
          {e.getValue().quoteAsset?.ticker || ""}
        </Typography.Text>
      );
    },
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        Volume 24h
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
    sortingFn: (rowA, rowB, columnId) => {
      const numA = (rowA.getValue(columnId) as LmpMarketConfig).quoteVolume24h;
      const numB = (rowB.getValue(columnId) as LmpMarketConfig).quoteVolume24h;
      return numA > numB ? 1 : -1;
    },
  }),
];
