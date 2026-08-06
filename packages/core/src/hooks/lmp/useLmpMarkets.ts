import { useNativeApi } from "@orderbook/core/providers/public/nativeApi";
import { useQuery } from "@tanstack/react-query";

import { LmpMarketConfig, QUERY_KEYS, useMarkets, useTickers } from "../..";

export const useLmpMarkets = (epoch?: number) => {
  const { api, lmp } = useNativeApi();
  const { list: allMarkets } = useMarkets();
  const { tickers: allTickers } = useTickers();

  const enabled =
    !!api &&
    api?.isConnected &&
    !!lmp &&
    allMarkets?.length > 0 &&
    allTickers?.length > 0;

  const { data, status } = useQuery({
    queryKey: QUERY_KEYS.lmpMarkets(epoch || 0),
    queryFn: async () => {
      if (!api?.isConnected || !lmp) return [];

      const currentEpoch = epoch || (await lmp.queryCurrentEpoch());
      const markets = await lmp.queryAllMarkets(currentEpoch);

      const res = markets.map(async (m): Promise<LmpMarketConfig> => {
        const baseId = m.base === "polkadex" ? "PDEX" : m.base;
        const quoteId = m.quote === "polkadex" ? "PDEX" : m.quote;

        const market = allMarkets.find(
          (e) => e.baseAsset.id === baseId && e.quoteAsset.id === quoteId
        );

        const ticker = allTickers.find(
          (e) => e.market === `${baseId}-${quoteId}`
        );

        const marketScore = await lmp.getTotalScoreAndFeeForMarket(
          currentEpoch,
          `${baseId}-${quoteId}`
        );

        return {
          baseAsset: market?.baseAsset,
          quoteAsset: market?.quoteAsset,
          makerScore: marketScore.score,
          traderScore: marketScore.totalFee,
          baseVolume24h: ticker?.baseVolume || 0,
          quoteVolume24h: ticker?.quoteVolume || 0,
        };
      });

      return await Promise.all(res);
    },
    enabled,
  });

  return { markets: data, isLoading: status === "pending" };
};
