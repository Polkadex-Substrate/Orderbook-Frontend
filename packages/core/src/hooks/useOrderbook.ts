import { useEffect, useMemo, useState } from "react";
import {
  decimalPlaces,
  getCurrentMarket,
  mergeDuplicateOrders,
} from "@orderbook/core/helpers";
import { trimFloat } from "@polkadex/numericals";
import { useQuery } from "@tanstack/react-query";
import {
  MAX_DIGITS_AFTER_DECIMAL,
  QUERY_KEYS,
} from "@orderbook/core/constants";
import { useRecentTrades, useTickers } from "@orderbook/core/hooks";

import { useOrderbookService } from "../providers/public/orderbookServiceProvider/useOrderbookService";
import { useSettingsProvider } from "../providers/public/settings";
import { appsyncOrderbookService } from "../utils/orderbookService";

export type DecimalSize = { size: number; length: number };

export function useOrderbook(defaultMarket: string) {
  const [initialState, setInitialState] = useState<DecimalSize[]>([
    { size: 0.1, length: 1 },
    { size: 0.01, length: 2 },
    { size: 0.001, length: 3 },
    { size: 0.0001, length: 4 },
    { size: 0.00001, length: 5 },
    { size: 0.000001, length: 6 },
  ]);

  const [filterState, setFilterState] = useState("Order");
  const [sizeState, setSizeState] = useState(initialState[1]);

  const { markets: list } = useOrderbookService();
  const { onHandleError } = useSettingsProvider();
  const {
    currentTicker: { currentPrice },
    tickerLoading,
  } = useTickers(defaultMarket);

  const { isPriceUp } = useRecentTrades(defaultMarket);

  const { data, isLoading, isRefetching } = useQuery({
    queryKey: QUERY_KEYS.orderBook(defaultMarket),
    queryFn: async () => {
      const orderbook =
        await appsyncOrderbookService.query.getOrderbook(defaultMarket);

      const bids = orderbook.bids.map((bid) => {
        return [String(bid.price), String(bid.qty)];
      });
      bids.sort((a, b) => Number(a[0]) - Number(b[0]));
      const asks = orderbook.asks.map((ask) => {
        return [String(ask.price), String(ask.qty)];
      });
      asks.sort((a, b) => Number(a[0]) - Number(b[0]));

      return { bids, asks };
    },
    enabled: Boolean(defaultMarket?.length > 0),
    onError: (error) => {
      const errorMessage =
        error instanceof Error ? error.message : (error as string);
      onHandleError(errorMessage);
    },
    refetchOnMount: false,
    refetchOnWindowFocus: true,
    refetchInterval: 30 * 1000, // 30s
  });

  const [asks, bids] = useMemo(() => {
    const askOrders = mergeDuplicateOrders(
      (data?.asks || []).map((e) => [
        +trimFloat({ value: e[0], digitsAfterDecimal: sizeState.length }),
        +e[1],
      ])
    );

    const bidOrders = mergeDuplicateOrders(
      (data?.bids || []).map((e) => [
        +trimFloat({ value: e[0], digitsAfterDecimal: sizeState.length }),
        +e[1],
      ])
    );

    return [sortArrayDescending(askOrders), sortArrayDescending(bidOrders)];
  }, [data?.asks, data?.bids, sizeState.length]);

  const currentMarket = getCurrentMarket(list, defaultMarket);

  const handleChange = (select: string) => setFilterState(select);

  const handleAction = (select: { size: number; length: number }) =>
    setSizeState(select);

  const pricePrecision = currentMarket
    ? decimalPlaces(currentMarket.price_tick_size)
    : MAX_DIGITS_AFTER_DECIMAL;

  const qtyPrecision = currentMarket
    ? decimalPlaces(currentMarket.qty_step_size)
    : MAX_DIGITS_AFTER_DECIMAL;

  useEffect(() => {
    // Generate array from 1 to (pricePrecision + 1) & take last 5 elements only
    setInitialState(
      Array.from(
        { length: pricePrecision + 1 },
        (_, i): DecimalSize => ({
          size: 1 / Math.pow(10, i + 1),
          length: i + 1,
        })
      ).slice(-5)
    );
  }, [pricePrecision]);

  useEffect(() => {
    setSizeState(initialState.at(-2) ?? (initialState.at(-1) as DecimalSize));
  }, [initialState]);

  return {
    isPriceUp,
    qtyPrecision,
    lastPriceValue: currentPrice,
    hasMarket: !!currentMarket,
    loading: isRefetching ? false : isLoading || tickerLoading,
    asks,
    bids,
    initialState,
    filterState,
    sizeState,
    quoteUnit: currentMarket?.quoteAsset?.ticker,
    baseUnit: currentMarket?.baseAsset?.ticker,
    handleChange,
    handleAction,
  };
}

function sortArrayDescending(arr: string[][]) {
  return arr?.sort((a, b) => Number(b[0]) - Number(a[0]));
}
