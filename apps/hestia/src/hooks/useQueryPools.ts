// TODO: Move this to packages/core/hooks
import { useNativeApi } from "@orderbook/core/providers/public/nativeApi";
import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS, useAssets } from "@orderbook/core/index";

export const useQueryPools = () => {
  const { swap } = useNativeApi();
  const { assets } = useAssets();

  const {
    data: pools,
    isLoading: poolsLoading,
    isSuccess: poolsSuccess,
    error: poolsError,
  } = useQuery({
    queryKey: QUERY_KEYS.queryPools(),
    enabled: !!swap && assets.length > 0,
    queryFn: async () => {
      if (!swap || !assets) return;
      const data = await swap.queryPools();
      // filter out pools with 0 liquidity
      const value = await Promise.all(
        data.map(async (e) => {
          const quote = assets.find(
            (val) => val.id.toLowerCase() === e.quote.toLowerCase()
          );
          const reserve = await swap.getReserves(e.base, e.quote);
          return {
            ...quote,
            reserve: reserve.quote,
          };
        })
      );
      return value.sort((a, b) => b.reserve - a.reserve);
    },
  });

  return {
    pools,
    poolsLoading,
    poolsSuccess,
    poolsError,
  };
};
