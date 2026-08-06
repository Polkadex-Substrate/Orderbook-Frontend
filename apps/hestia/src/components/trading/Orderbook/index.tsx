import {
  getCurrentMarket,
  useMarkets,
  useOrderbook,
} from "@orderbook/core/index";
import classNames from "classnames";
import { Skeleton, Typography } from "@mitrabook/ux";

import { Header } from "./header";
import { LastPrice } from "./lastPrice";
import { Table } from "./table";

export const Orderbook = ({ id }: { id: string }) => {
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
      data-tour="orderbook"
      className="flex flex-col flex-1 h-full overflow-hidden"
    >
      <Header
        selectedDecimal={sizeState.size}
        decimalSizes={initialState}
        onChangeDecimal={handleAction}
        filterBy={filterState}
        onChangeFilterBy={handleChange}
      />
      <div
        className={classNames(
          "flex-1  border-t border-t-primary bg-level-0 overflow-auto h-full",
          filterState === "Order"
            ? "grid grid-rows-[auto_1fr_auto_1fr]"
            : "flex flex-col"
        )}
      >
        <div className="grid grid-cols-[30%_35%_35%] p-2 sticky top-0 left-0">
          <Typography.Text size="xs" appearance="primary">
            Price {!loading && `(${quoteUnit})`}
          </Typography.Text>
          <Typography.Text
            size="xs"
            appearance="primary"
            className="justify-self-end"
          >
            Amount {!loading && `(${baseUnit})`}
          </Typography.Text>
          <Typography.Text
            size="xs"
            appearance="primary"
            className="justify-self-end"
          >
            Total {!loading && `(${quoteUnit})`}
          </Typography.Text>
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
          />
        </Skeleton>
        <LastPrice
          loading={!!loading}
          lastPrice={lastPriceValue}
          isPriceUp={isPriceUp}
          inverted={filterState === "OrderDesc"}
        />
        <Skeleton loading={!!loading}>
          <Table
            pricePrecision={sizeState.length}
            qtyPrecision={qtyPrecision}
            active={filterState !== "OrderAsc"}
            asks={asks}
            bids={bids}
            orders={bids}
          />
        </Skeleton>
      </div>
    </div>
  );
};
