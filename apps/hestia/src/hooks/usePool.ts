// TODO: Move this to packages/core/hooks
import { useNativeApi } from "@orderbook/core/providers/public/nativeApi";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { QUERY_KEYS, useAssets } from "@orderbook/core/index";

export const usePool = ({
  asset = "",
  amount = 0,
  enabled = true,
}: {
  asset?: string;
  amount?: number;
  enabled?: boolean;
}) => {
  const { swap } = useNativeApi();
  const { assets } = useAssets();

  const enableQuery = useMemo(
    () => !!assets && !!swap && enabled,
    [assets, swap, enabled]
  );

  const handleSwapReserve = useCallback(
    async (assetId: string) => await swap?.getReserves("PDEX", assetId),
    [swap]
  );

  const { data: poolReserves, isSuccess: poolReservesSuccess } = useQuery({
    queryKey: [QUERY_KEYS.poolReserves(!!swap, assets.length)],
    enabled: enableQuery,
    queryFn: async () => {
      const results = await Promise.all(
        assets.map(async (e) => {
          if (e.id === "PDEX")
            return {
              name: e.ticker,
              id: e.id,
              poolReserve: 1,
            };
          else {
            const reserve = await handleSwapReserve(e.id);
            return {
              name: e.ticker,
              id: e.id,
              poolReserve: reserve?.base,
            };
          }
        })
      );

      return results.sort(
        (a, b) => Number(b.poolReserve) - Number(a.poolReserve)
      );
    },
    onError: (e) => console.log("Error", e),
  });

  const enableQuotePrice = useMemo(
    () => poolReservesSuccess && !!enableQuery && !!asset,
    [poolReservesSuccess, enableQuery, asset]
  );

  const { data: swapPrice, isLoading: swapLoading } = useQuery({
    queryKey: [QUERY_KEYS.quotePrice(asset, amount)],
    enabled: enableQuotePrice,
    queryFn: async () => {
      return await swap?.quotePriceTokensForExactTokens(asset, "PDEX", amount);
    },
    onError: (e) => console.log("Error", e),
  });

  return {
    poolReserves,
    poolReservesSuccess,
    swapPrice,
    swapLoading,
  };
};
