import { useInfiniteQuery } from "@tanstack/react-query";
import { QUERY_KEYS, SUBSCAN_PER_PAGE_LIMIT } from "@orderbook/core/constants";
import { INDEXER_GETTERS } from "@orderbook/core/helpers/indexer";

export const useTransferHistory = (
  subqueryUrl: string,
  address: string,
  shouldFetch: boolean,
  PER_PAGE_LIMIT?: number
) => {
  return useInfiniteQuery({
    queryKey: QUERY_KEYS.blockchainTransfers(
      address,
      PER_PAGE_LIMIT ?? SUBSCAN_PER_PAGE_LIMIT
    ),
    queryFn: async ({ pageParam }) => {
      const data = await INDEXER_GETTERS.fetchTransfers(
        subqueryUrl,
        address,
        pageParam,
        PER_PAGE_LIMIT ?? SUBSCAN_PER_PAGE_LIMIT
      );
      return data;
    },
    enabled: shouldFetch,
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      // If the last page contains less than required results, don't fetch the next page
      if (
        lastPage?.transfers?.length < (PER_PAGE_LIMIT ?? SUBSCAN_PER_PAGE_LIMIT)
      ) {
        return undefined;
      }
      // Otherwise, determine the next page number based on the length of allPages
      return pages?.length;
    },
  });
};
