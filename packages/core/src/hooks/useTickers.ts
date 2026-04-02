import _ from "lodash";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS, defaultTicker } from "../constants";
import { useSettingsProvider } from "../providers/public/settings";
import { useOrderbookService } from "../providers/public/orderbookServiceProvider/useOrderbookService";
import { appsyncOrderbookService } from "../utils/orderbookService";
import { decimalPlaces, getCurrentMarket } from "../helpers";

import { useRecentTrades } from "./useRecentTrades";

export function useTickers(defaultMarket?: string) {
  const { markets } = useOrderbookService();
  const { onHandleError } = useSettingsProvider();
  const currentMarket = getCurrentMarket(markets, defaultMarket || null);
  const { list: recentTrades } = useRecentTrades(currentMarket?.id as string);

  const shouldFetchTickers = Boolean(markets && markets?.length > 0);

  const { data: tickers, isLoading: isTickersLoading } = useQuery({
    queryKey: QUERY_KEYS.tickers(),
    enabled: shouldFetchTickers,
    queryFn: async () => {
      const tickersPromises = markets.map(({ id }) =>
        appsyncOrderbookService.query.getTicker(id)
      );
      const tickersData = await Promise.all(tickersPromises);

      return tickersData.map((item) => {
        const priceChange = Number(item.close) - Number(item.open);
        const priceChangePercent = (priceChange / Number(item.open)) * 100;

        const market = markets?.find((market) => market.id === item.market);

        const pricePrecision = decimalPlaces(market?.price_tick_size || 0);

        const priceChange24Hr = _.round(priceChange, pricePrecision);
        const priceChangePercent24Hr = _.round(
          isNaN(priceChangePercent) ? 0 : priceChangePercent,
          pricePrecision
        );

        return {
          ...item,
          priceChange24Hr,
          priceChangePercent24Hr,
        };
      });
    },
    onError: (error) => {
      const errorMessage =
        error instanceof Error ? error.message : (error as string);
      onHandleError(errorMessage);
    },
    refetchOnMount: false,
  });

  const currentTicker = useMemo(() => {
    const currentTickerSelected = tickers?.find(
      (x) => x.market === defaultMarket
    );
    if (!currentTickerSelected) {
      return {
        ...defaultTicker,
        priceChange24Hr: 0,
        priceChangePercent24Hr: 0,
      };
    }
    return {
      ...currentTickerSelected,
      currentPrice:
        currentTickerSelected.currentPrice || recentTrades.at(0)?.price || 0,
    };
  }, [defaultMarket, recentTrades, tickers]);

  return {
    tickers: tickers ?? [],
    tickerLoading: isTickersLoading,
    currentTicker,
  };
}
