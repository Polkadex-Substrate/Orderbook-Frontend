import { useQuery } from "@tanstack/react-query";
import { lmpApi, LMPPair, MarketTier } from "@orderbook/core/lib/lmpApi";
import { QUERY_KEYS } from "@orderbook/core/constants/queryKeys";

export { type LMPPair, type MarketTier };

export const useLmpPairs = () => {
  const { data, status } = useQuery({
    queryKey: QUERY_KEYS.lmpPairs(),
    queryFn: () => lmpApi.fetchPairs(),
  });

  return {
    pairs: data?.pairs ?? [],
    isLoading: status === "pending",
  };
};
