import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  PublicTrade,
  appsyncOrderbookService,
} from "@orderbook/core/utils/orderbookService";

import { QUERY_KEYS, RECENT_TRADES_LIMIT } from "../constants";
import { getIsDecreasingArray } from "../helpers";

export function useRecentTrades(market: string) {

  const {
    data: recentTradesList,
    isLoading,
    isFetching,
  } = useQuery<PublicTrade[]>({
    queryKey: QUERY_KEYS.recentTrades(market),
    enabled: Boolean(market?.length > 0),
    queryFn: async () =>
      await appsyncOrderbookService.query.getLatestTradesForMarket({
        market,
        limit: RECENT_TRADES_LIMIT,
      }),
    refetchOnMount: false,
  });

  const isDecreasing = getIsDecreasingArray(recentTradesList ?? []);

  const currentTradePrice = useMemo(() => {
    if (!recentTradesList) return 0;
    return recentTradesList.length > 0 ? recentTradesList[0].price : 0;
  }, [recentTradesList]);

  const lastTradePrice = useMemo(() => {
    if (!recentTradesList) return 0;
    return recentTradesList.length > 1 ? recentTradesList[1].price : 0;
  }, [recentTradesList]);

  return {
    list: recentTradesList ?? [],
    loading: isLoading || isFetching,
    isDecreasing,
    isPriceUp: currentTradePrice >= lastTradePrice,
  };
}
