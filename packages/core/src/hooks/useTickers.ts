import _ from "lodash";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS, defaultTicker } from "../constants";
import { useOrderbookService } from "../providers/public/orderbookServiceProvider/useOrderbookService";
import { appsyncOrderbookService } from "../utils/orderbookService";
import { decimalPlaces, getCurrentMarket } from "../helpers";
import {
  TICKERS_REFETCH_MS,
  collectSettled,
  describeBatch,
  isTotalFailure,
} from "../helpers/tickerBatch";
import { percentChange } from "../utils/orderbookService/appsync/tickerEnvelope";

import { useRecentTrades } from "./useRecentTrades";

export function useTickers(defaultMarket?: string) {
  const { markets } = useOrderbookService();
  const currentMarket = getCurrentMarket(markets, defaultMarket || null);
  const { list: recentTrades } = useRecentTrades(currentMarket?.id as string);

  const shouldFetchTickers = Boolean(markets && markets?.length > 0);

  const { data: tickers, isLoading: isTickersLoading } = useQuery({
    queryKey: QUERY_KEYS.tickers(),
    enabled: shouldFetchTickers,
    queryFn: async () => {
      /*
       * allSettled, NOT all.
       *
       * `Promise.all` rejects on the first rejection, so one market failing
       * discarded the tickers of every market that had succeeded. That is why
       * the whole table rendered as volume 0 and change "-" while the orderbook
       * beside it had live prices. A failure should cost one row, not all of
       * them. See helpers/tickerBatch.ts for the measurements.
       */
      const settled = await Promise.allSettled(
        markets.map(({ id }) => appsyncOrderbookService.query.getTicker(id))
      );
      const batch = collectSettled(settled);
      const partial = describeBatch(batch);
      if (partial) console.warn(partial);
      // Only a total failure is an error. Partial data beats none: the user can
      // trade the markets that did load, and the rest honestly show "-".
      if (isTotalFailure(batch))
        throw new Error(
          `[tickers] all ${batch.attempted} markets failed to return ticker data`
        );

      return batch.fulfilled.map((item) => {
        const market = markets?.find((market) => market.id === item.market);
        const pricePrecision = decimalPlaces(market?.price_tick_size || 0);

        // percentChange returns null when the change is genuinely unknowable -
        // either side missing, or a window that opened at zero. The old
        // expression guarded with isNaN only, which misses Infinity: `5 / 0` is
        // not NaN, so a market opening at 0 rendered "Infinity%".
        //
        // Number(null) is 0, so the old subtraction also turned a missing close
        // into a confident "no change" instead of "no data".
        const pct = percentChange(item.open, item.close);
        const absolute =
          item.open === null || item.close === null
            ? null
            : item.close - item.open;

        const priceChange24Hr =
          absolute === null ? null : _.round(absolute, pricePrecision);
        // Rounded as a PERCENTAGE (2dp), not by the market's price tick. A tick
        // of 0.00000001 was rendering percentages to 8 decimal places.
        const priceChangePercent24Hr = pct === null ? null : _.round(pct, 2);

        return {
          ...item,
          priceChange24Hr,
          priceChangePercent24Hr,
        };
      });
    },
    refetchOnMount: false,
    /*
     * The query had no refetch of any kind, so once react-query exhausted its
     * retries nothing ever asked again: measured eleven minutes of complete API
     * silence after the initial failures, with the ticker columns blank for the
     * whole session. A transient failure at load should cost half a minute of
     * empty cells, not the entire visit.
     */
    refetchInterval: TICKERS_REFETCH_MS,
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
