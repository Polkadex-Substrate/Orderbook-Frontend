import {
  getCurrentMarket,
  useMarkets,
  useOrderbook,
} from "@orderbook/core/index";
import classNames from "classnames";
import { Skeleton, Typography } from "@polkadex/ux";

import { Header } from "./header";
import { LastPrice } from "./lastPrice";
import { Table } from "./table";

export const Orderbook = ({
  id,
  responsive = false,
}: {
  id: string;
  responsive?: boolean;
}) => {
  const { list } = useMarkets();

  const currentMarket = getCurrentMarket(list, id);
  const {
    isPriceUp,
    asks,
    bids,
    lastPriceValue,
    sizeState,
    filterState,
    initialState,
    handleChange,
    handleAction,
    loading,
    qtyPrecision,
    quoteUnit,
    baseUnit,
  } = useOrderbook(currentMarket?.id ?? "");

  return (
    <div
      className={classNames(
        "flex flex-col h-full overflow-hidden",
        responsive ? "flex-auto max-h-96" : "flex-1"
      )}
    >
      {!responsive && (
        <Header
          selectedDecimal={sizeState.size}
          decimalSizes={initialState}
          onChangeDecimal={handleAction}
          filterBy={filterState}
          onChangeFilterBy={handleChange}
        />
      )}
      <div
        className={classNames(
          "flex-1  border-t border-t-primary bg-level-0 overflow-auto h-full",
          filterState === "Order"
            ? "grid grid-rows-[auto_1fr_auto_1fr]"
            : "flex flex-col"
        )}
      >
        <div
          className={classNames(
            "grid sticky top-0 left-0",
            responsive
              ? "grid-cols-[50%_50%] pl-2 pt-2 pb-0.5"
              : "p-2 grid-cols-[30%_35%_35%]"
          )}
        >
          {responsive ? (
            <div className="flex flex-col">
              <Typography.Text size="2xs" appearance="primary">
                Price
              </Typography.Text>
              <Typography.Text size="2xs" appearance="primary">
                {!loading && `(${quoteUnit})`}
              </Typography.Text>
            </div>
          ) : (
            <Typography.Text size="xs" appearance="primary">
              Price {!loading && `(${quoteUnit})`}
            </Typography.Text>
          )}

          {responsive ? (
            <div className="flex flex-col text-right">
              <Typography.Text size="2xs" appearance="primary">
                Amount
              </Typography.Text>
              <Typography.Text size="2xs" appearance="primary">
                {!loading && `(${baseUnit})`}
              </Typography.Text>
            </div>
          ) : (
            <Typography.Text
              size="xs"
              appearance="primary"
              className="justify-self-end"
            >
              Amount {!loading && `(${baseUnit})`}
            </Typography.Text>
          )}
          {!responsive && (
            <Typography.Text
              size="xs"
              appearance="primary"
              className="justify-self-end"
            >
              Total {!loading && `(${quoteUnit})`}
            </Typography.Text>
          )}
        </div>
        <Skeleton loading={!!loading}>
          <Table
            pricePrecision={sizeState.length}
            qtyPrecision={qtyPrecision}
            isSell
            active={filterState !== "OrderDesc"}
            asks={asks}
            bids={bids}
            orders={asks}
            responsive={responsive}
          />
        </Skeleton>
        <LastPrice
          loading={!!loading}
          lastPrice={lastPriceValue}
          isPriceUp={isPriceUp}
          inverted={filterState === "OrderDesc"}
          responsive={responsive}
        />
        <Skeleton loading={!!loading}>
          <Table
            pricePrecision={sizeState.length}
            qtyPrecision={qtyPrecision}
            active={filterState !== "OrderAsc"}
            asks={asks}
            bids={bids}
            orders={bids}
            responsive={responsive}
          />
        </Skeleton>
      </div>
    </div>
  );
};
