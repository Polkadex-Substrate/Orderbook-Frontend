"use client";
/**
 * The trading chart.
 *
 * Candles come from the REST datafeed gateway (datafeed.polkadex.ee, UDF
 * protocol - see ./datafeed.ts); depth from useOrderbook; the user's open
 * orders and fills are drawn on the chart.
 *
 * History previously came from the exchange's own klines over GraphQL
 * (fetchCandles) with live bars over the kline subscription. The datafeed is
 * the intended source, so both were replaced - see the note on `subscribe`
 * below for why live bars now poll rather than stream.
 */
import { useMemo, useState } from "react";
import { useWindowSize } from "react-use";
import {
  useOpenOrders,
  useOrderbook,
  useTradeHistory,
} from "@orderbook/core/hooks";
import { Market } from "@orderbook/core/utils/orderbookService";
import {
  CandleChart,
  CandleFeed,
  ChartType,
  DARK_THEME,
  DepthChart,
  DepthLevel,
  FillMark,
  IndicatorConfig,
  OrderMark,
  Resolution,
  Toolbar,
  resolutionToMs,
} from "@orderbook/chart";

import { fetchUdfHistory } from "./datafeed";

const DEPTH_LEVELS = 40;
const FILLS_LIMIT = 30;

/**
 * How often to re-poll the datafeed for the current bar.
 *
 * The gateway is REST-only, so there is nothing to stream. Capped at 15s so a
 * 1-week resolution does not mean a week between updates, and floored at the
 * bar length so a 1-minute chart is not polled pointlessly often.
 */
const POLL_CEILING_MS = 15_000;
const pollIntervalFor = (r: Resolution) =>
  Math.min(resolutionToMs(r), POLL_CEILING_MS);

export const GraphV2 = ({ currentMarket }: { currentMarket?: Market }) => {
  const marketId = currentMarket?.id ?? "";
  const marketName = currentMarket?.name ?? "";

  const [resolution, setResolution] = useState<Resolution>("60");
  const [chartType, setChartType] = useState<ChartType>("candles");
  const [indicators, setIndicators] = useState<IndicatorConfig>({});
  const [showDepth, setShowDepth] = useState(false);

  // Ultrawide/4K: enough room to dock the depth chart beside the candles
  // permanently instead of hiding it behind the toolbar toggle.
  const { width } = useWindowSize();
  const superWide = width >= 2200;

  /** Adapter: REST datafeed gateway -> CandleFeed. */
  const feed = useMemo<CandleFeed>(
    () => ({
      getCandles: ({ market, resolution: r, from, to }) =>
        fetchUdfHistory({ market, resolution: r, from, to }),

      /**
       * Poll for the latest bar rather than stream.
       *
       * The datafeed is REST-only. The previous implementation streamed live
       * bars from the exchange's own kline subscription while loading history
       * from elsewhere - two different price series on one chart, which shows
       * up as the last candle jumping away from the ones before it the moment
       * a trade lands. One source is worth the polling.
       *
       * Only the trailing window is re-fetched, not the whole history, and
       * CandleChart already tolerates a bar it has seen before: it matches on
       * `time` and replaces in place.
       */
      subscribe: ({ market, resolution: r, onBar }) => {
        let cancelled = false;

        const tick = async () => {
          try {
            const barMs = resolutionToMs(r);
            // Two bars back: enough to catch a bucket rollover between polls
            // without refetching history every time.
            const bars = await fetchUdfHistory({
              market,
              resolution: r,
              from: new Date(Date.now() - barMs * 2),
              to: new Date(),
            });
            if (cancelled || !bars.length) return;
            onBar(bars[bars.length - 1]);
          } catch {
            // Swallow: getCandles surfaces load failures to the user already,
            // and a failed poll should not tear down a working chart. The next
            // tick retries.
          }
        };

        // Fire once immediately so the current bar is not up to one interval
        // stale on mount.
        tick();
        const id = setInterval(tick, pollIntervalFor(r));

        return () => {
          cancelled = true;
          clearInterval(id);
        };
      },
    }),
    []
  );

  /* Depth (useOrderbook returns [price, qty] strings ASC; depth chart wants
     best-first: bids DESC, asks ASC). */
  const { asks, bids } = useOrderbook(marketId);
  const depthBids = useMemo<DepthLevel[]>(
    () =>
      (bids ?? [])
        .map(([p, q]) => [Number(p), Number(q)] as DepthLevel)
        .sort((a, b) => b[0] - a[0])
        .slice(0, DEPTH_LEVELS),
    [bids]
  );
  const depthAsks = useMemo<DepthLevel[]>(
    () =>
      (asks ?? [])
        .map(([p, q]) => [Number(p), Number(q)] as DepthLevel)
        .sort((a, b) => a[0] - b[0])
        .slice(0, DEPTH_LEVELS),
    [asks]
  );

  /* My open orders on this market -> price lines. */
  const { openOrders } = useOpenOrders();
  const orderMarks = useMemo<OrderMark[]>(
    () =>
      (openOrders ?? [])
        .filter((o) => o.market?.name === marketName)
        .map((o) => ({
          id: o.orderId,
          side: o.side,
          price: Number(o.price),
          qty: Number(o.quantity),
        })),
    [openOrders, marketName]
  );

  /* My recent fills on this market -> markers. */
  const { trades } = useTradeHistory(FILLS_LIMIT);
  const fillMarks = useMemo<FillMark[]>(
    () =>
      (trades ?? [])
        .filter((t) => t.market?.name === marketName)
        .map((t) => ({
          id: t.tradeId,
          side: t.side,
          price: Number(t.price),
          qty: Number(t.qty),
          time: new Date(t.timestamp).getTime(),
        })),
    [trades, marketName]
  );

  if (!marketId) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div
      data-tour="price-chart"
      className="flex flex-col flex-1 h-full w-full bg-[#0d0d0f] text-[#d1d4dc]"
    >
      <Toolbar
        resolution={resolution}
        onResolution={setResolution}
        chartType={chartType}
        onChartType={setChartType}
        indicators={indicators}
        onIndicators={setIndicators}
        showDepth={showDepth}
        onToggleDepth={() => setShowDepth((v) => !v)}
      />
      <div className="flex-1 min-h-[260px] flex min-w-0">
        <div className="flex-1 min-w-0">
          <CandleChart
            feed={feed}
            market={marketId}
            marketLabel={marketName}
            resolution={resolution}
            chartType={chartType}
            indicators={indicators}
            openOrders={orderMarks}
            fills={fillMarks}
            theme={DARK_THEME}
            // Surface candle-feed failures: CandleChart only flips to its
            // "Chart data not available" overlay and otherwise swallows the
            // error, which makes server/auth issues undiagnosable.
            onError={(e) =>
              console.error(`[GraphV2] getCandles failed for ${marketId}:`, e)
            }
          />
        </div>
        {superWide && (
          <div className="w-[380px] shrink-0 border-l border-gray-800">
            <DepthChart bids={depthBids} asks={depthAsks} fill />
          </div>
        )}
      </div>
      {showDepth && !superWide && (
        <div className="border-t border-gray-800">
          <DepthChart bids={depthBids} asks={depthAsks} height={150} />
        </div>
      )}
    </div>
  );
};
