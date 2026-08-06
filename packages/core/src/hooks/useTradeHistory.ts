import { useMemo } from "react";
import { Ifilters } from "@orderbook/core/providers/types";
import { useProfile } from "@orderbook/core/providers/user/profile";
import { useInfiniteQuery } from "@tanstack/react-query";

import { QUERY_KEYS, TRADE_HISTORY_PER_PAGE_LIMIT } from "../constants";
import { appsyncOrderbookService } from "../utils/orderbookService";
import { useSessionProvider } from "../providers/user/sessionProvider";

export function useTradeHistory(
  rowsPerPage: number,
  filters?: Ifilters,
  basedOnFundingAccount?: boolean
) {
  const {
    selectedAddresses: { tradeAddress, mainAddress },
  } = useProfile();
  const { dateFrom, dateTo } = useSessionProvider();

  const address = useMemo(
    () => (basedOnFundingAccount ? mainAddress : tradeAddress),
    [basedOnFundingAccount, mainAddress, tradeAddress]
  );

  const shouldFetchTradeHistory = address?.length > 0;

  const {
    data,
    fetchNextPage: onFetchNextPage,
    isLoading: fetching,
    hasNextPage,
    error,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: QUERY_KEYS.tradeHistory(
      dateFrom,
      dateTo,
      address,
      rowsPerPage,
      basedOnFundingAccount
    ),
    enabled: shouldFetchTradeHistory,
    queryFn: async ({ pageParam }) => {
      return await appsyncOrderbookService.query.getTradeHistory({
        address,
        from: dateFrom?.toISOString(),
        to: dateTo?.toISOString(),
        pageParams: pageParam,
        limit: TRADE_HISTORY_PER_PAGE_LIMIT,
        batchLimit: rowsPerPage,
        basedOnFundingAccount,
      });
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => {
      // If the last page contains nextToken as null, don't fetch the next page
      if (!lastPage.nextToken) {
        return undefined;
      }
      return lastPage.nextToken;
    },
  });

  const list = useMemo(() => {
    const tradeHistory = data?.pages?.flatMap((page) => page.data) ?? [];
    return tradeHistory.sort((a, b) => {
      const timestampA = new Date(a.timestamp).getTime();
      const timestampB = new Date(b.timestamp).getTime();
      return timestampB - timestampA;
    });
  }, [data?.pages]);

  const updatedTradeList = useMemo(() => {
    let tradeHistoryList = list.filter((item) => !item.isReverted);

    if (filters?.showReverted) {
      tradeHistoryList = list.filter((item) => item.isReverted);
    }

    if (filters?.onlyBuy) {
      tradeHistoryList = tradeHistoryList.filter(
        (data) => data.side?.toUpperCase() === "BID"
      );
    } else if (filters?.onlySell) {
      tradeHistoryList = tradeHistoryList.filter(
        (data) => data.side.toUpperCase() === "ASK"
      );
    }

    return tradeHistoryList;
  }, [filters?.onlyBuy, filters?.onlySell, filters?.showReverted, list]);

  return {
    trades: updatedTradeList,
    isLoading: fetching,
    hasNextPage,
    // consumers render this directly, so surface the message (not the Error)
    error: error?.message ?? "",
    onFetchNextPage,
    isFetchingNextPage,
  };
}
