import { createColumnHelper } from "@tanstack/react-table";
import classNames from "classnames";
import { Decimal, InitialMarkets, isNegative } from "@orderbook/core/index";
import { Typography, Token, tokenAppearance } from "@polkadex/ux";
import { RiStarLine } from "@remixicon/react";
import { trimFloat } from "@polkadex/numericals";
import { Dispatch, SetStateAction } from "react";

export type ColumnSelector = "price" | "volume";

const columnHelper = createColumnHelper<InitialMarkets>();
export const columns = ({
  isPrice,
  setState,
  onChangeFavourite,
}: {
  isPrice: boolean;
  setState: Dispatch<SetStateAction<ColumnSelector>>;
  onChangeFavourite: (e: string) => void;
}) => [
  columnHelper.accessor((row) => row, {
    id: "coin",
    cell: (e) => {
      const { isFavourite, baseAsset, quoteAsset, id } = e.getValue();
      return (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChangeFavourite(id);
            }}
          >
            <RiStarLine
              className={classNames(
                isFavourite ? "text-primary-base" : "text-primary-disabled",
                "w-3 h-3"
              )}
            />
          </button>
          <div className="flex items-center gap-1">
            <Token
              size="xs"
              name={baseAsset.ticker as string}
              appearance={baseAsset.ticker as keyof typeof tokenAppearance}
              className="rounded-full border border-secondary"
            />
            <Typography.Text size="xs" className="uppercase">
              {baseAsset.ticker}/
              <Typography.Text size="xs" appearance="primary">
                {quoteAsset.ticker}
              </Typography.Text>
            </Typography.Text>
          </div>
        </div>
      );
    },
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        Market
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
  }),
  columnHelper.accessor((row) => row, {
    id: "priceAndVolume",
    cell: (e) => {
      const value = isPrice
        ? e.getValue().last
        : trimFloat({ value: e.getValue().volume, digitsAfterDecimal: 2 });
      return <Typography.Text size="xs">{value}</Typography.Text>;
    },
    header: () => (
      <div className="flex gap-0.5 items-center justify-end cursor-pointer">
        <Typography.Text
          size="xs"
          onClick={() => setState("volume")}
          appearance={!isPrice ? "primary" : "secondary"}
        >
          Volume
        </Typography.Text>
        <Typography.Text size="xs" appearance="primary">
          /
        </Typography.Text>
        <Typography.Text
          size="xs"
          onClick={() => setState("price")}
          appearance={isPrice ? "primary" : "secondary"}
        >
          Price
        </Typography.Text>
      </div>
    ),
    footer: (e) => e.column.id,
  }),
  columnHelper.accessor((row) => row, {
    id: "change",
    cell: (e) => {
      const { price_change_percent } = e.getValue();
      const changeFormatted = Decimal.format(
        Number(price_change_percent),
        2,
        ","
      );
      const negative = isNegative(changeFormatted.toString());
      return (
        <Typography.Text size="xs" appearance={negative ? "danger" : "success"}>
          {changeFormatted}%
        </Typography.Text>
      );
    },
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        Change
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
  }),
];
