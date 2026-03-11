import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";

import { Ifilters } from "../providers/types";
import { sortOrdersDescendingTime } from "../helpers";
import { QUERY_KEYS } from "../constants";
import { useProfile } from "../providers/user/profile";
import { useSessionProvider } from "../providers/user/sessionProvider";
import { appsyncOrderbookService } from "../utils/orderbookService";

export const useOrderHistory = (
  rowsPerPage: number,
  filters?: Ifilters,
  basedOnFundingAccount?: boolean
) => {
  const {
    selectedAddresses: { tradeAddress, mainAddress },
  } = useProfile();
  const { dateFrom, dateTo } = useSessionProvider();

  const address = useMemo(
    () => (basedOnFundingAccount ? mainAddress : tradeAddress),
    [basedOnFundingAccount, mainAddress, tradeAddress]
  );

  const shouldFetchOrderHistory = address?.length > 0;

  const {
    data: orderHistoryList,
    fetchNextPage: fetchNextOrderHistoryPage,
    isLoading: isOrderHistoryLoading,
    hasNextPage: hasNextOrderHistoryPage,
    error: orderHistoryError,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: QUERY_KEYS.orderHistory(
      dateFrom,
      dateTo,
      address,
      rowsPerPage,
      basedOnFundingAccount
    ),
    enabled: shouldFetchOrderHistory,
    queryFn: async ({ pageParam = null }) => {
      return await appsyncOrderbookService.query.getOrderHistory({
        address,
        from: dateFrom.getTime().toString(),
        to: dateTo.getTime().toString(),
        limit: 25,
        pageParams: pageParam,
        batchLimit: rowsPerPage,
        basedOnFundingAccount,
      });
    },
    getNextPageParam: (lastPage) => {
      // If the last page contains nextToken as null, don't fetch the next page
      if (!lastPage.nextToken) {
        return false;
      }
      return lastPage.nextToken;
    },
  });

  const orderHistory = useMemo(
    () =>
      sortOrdersDescendingTime(
        orderHistoryList?.pages.flatMap((page) => page.data) ?? []
      ),
    [orderHistoryList?.pages]
  );

  const filteredOrderHistory = useMemo(() => {
    let orderHistoryList = orderHistory.filter(
      (item) => !item.isReverted && item.status !== "OPEN"
    );

    if (filters?.showReverted) {
      orderHistoryList = orderHistory.filter((item) => item.isReverted);
    }

    if (filters?.onlyBuy && filters.onlySell) {
      // Nothing to do
    } else if (filters?.onlyBuy) {
      orderHistoryList = orderHistoryList.filter(
        (data) => data.side?.toUpperCase() === "BID"
      );
    } else if (filters?.onlySell) {
      orderHistoryList = orderHistoryList.filter(
        (data) => data.side.toUpperCase() === "ASK"
      );
    }

    const acceptedStatus = {
      "all orders": "all",
      pending: "open",
      completed: "closed",
    };

    const status = filters?.status?.toLowerCase();
    const filterStatus =
      acceptedStatus[status as keyof typeof acceptedStatus] ?? status;

    if (filterStatus && filterStatus !== Object.values(acceptedStatus)[0]) {
      orderHistoryList = orderHistoryList.filter((item) => {
        return item.status.toLowerCase() === filterStatus;
      });
    }

    return orderHistoryList;
  }, [
    filters?.onlyBuy,
    filters?.onlySell,
    filters?.showReverted,
    filters?.status,
    orderHistory,
  ]);

  return {
    orderHistory: filteredOrderHistory,
    isLoading: isOrderHistoryLoading,
    hasNextPage: hasNextOrderHistoryPage,
    onFetchNextPage: fetchNextOrderHistoryPage,
    error: orderHistoryError as string,
    isFetchingNextPage,
  };
};
