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

import { DATAFEED_RESOLUTIONS, fetchUdfHistory } from "./datafeed";

const DEPTH_LEVELS = 40;
const FILLS_LIMIT = 30;

/**
 * How often to re-poll the datafeed for the current bar.
 *
 * The gateway is REST-only, so there is nothing to stream.
 *
 * This used to be `Math.min(resolutionToMs(r), 15_000)`, which the comment
 * described as "floored at the bar length" but which actually collapsed to a flat
 * 15s for EVERY resolution: min(60_000, 15_000) is 15_000 for a 1-minute bar, and
 * min(86_400_000, 15_000) is also 15_000 for a daily one. So a 1D chart re-fetched
 * /history four times a minute to refresh a bar that changes once a day.
 *
 * That is the "repetitive history requests" the datafeed sees, and it is why its
 * rate limiting trips: every poll is a full /history call, and each one carries a
 * CORS preflight, so the wire cost is double the poll count.
 *
 * Now it scales with the bar: a quarter of the bar length, clamped. A 1m chart
 * still updates every 15s; 1h and 1D settle at 60s, which is well inside the
 * resolution anyone would notice.
 */
const POLL_MIN_MS = 15_000;
const POLL_MAX_MS = 60_000;
const pollIntervalFor = (r: Resolution) =>
  Math.min(Math.max(resolutionToMs(r) / 4, POLL_MIN_MS), POLL_MAX_MS);

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
        // setInterval does not wait for the previous run. The gateway has been
        // observed taking 45 s, and at a 15 s cadence that stacks three
        // concurrent requests, each triggering its own CORS preflight - load
        // that grows precisely when the backend is already struggling. Skip a
        // tick instead; the next one carries the same information.
        let inFlight = false;

        const tick = async () => {
          if (inFlight) return;
          /*
           * Don't poll a chart nobody is looking at. A trading tab left open in the
           * background otherwise fetches /history every interval indefinitely -
           * hundreds of requests per idle tab per hour, all discarded, and a large
           * share of the load that trips the gateway's rate limiting.
           *
           * Cheaper and more correct than throttling: a hidden tab has no bar to
           * update. The visibilitychange handler below fetches immediately on
           * return, so coming back to the tab shows current data rather than
           * waiting out an interval.
           */
          if (
            typeof document !== "undefined" &&
            document.visibilityState === "hidden"
          ) {
            return;
          }
          inFlight = true;
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
          } finally {
            // finally, not the end of try: an aborted or failed request must
            // release the lock or polling stops permanently after one error.
            inFlight = false;
          }
        };

        // Fire once immediately so the current bar is not up to one interval
        // stale on mount.
        tick();
        const id = setInterval(tick, pollIntervalFor(r));

        // Catch up as soon as the tab is foregrounded again, so the skipped polls
        // above cost freshness only while nobody could see the chart.
        const onVisible = () => {
          if (document.visibilityState === "visible") tick();
        };
        document.addEventListener("visibilitychange", onVisible);

        return () => {
          cancelled = true;
          clearInterval(id);
          document.removeEventListener("visibilitychange", onVisible);
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
        // Only what the gateway serves - 15m, 30m, 4h and 1W would 400.
        resolutions={DATAFEED_RESOLUTIONS}
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
            // TICKER pair, not the asset-id pair. Market.id is
            // "{baseAssetId}-{quoteAssetId}" (e.g. "8-6") while Market.name is
            // "{baseTicker}/{quoteTicker}" (e.g. "WETH/PDEX"), and the datafeed
            // gateway resolves tickers only - asset ids come back 404 "asset
            // not found". Passing `marketId` here sent "symbol=8&vs_currency=6".
            //
            // GraphV1 built this request from `name.split("/")` and was right;
            // the id/name distinction was lost when the feed moved onto the
            // gateway. `market` reaches the datafeed adapter, so it must be
            // whatever that API keys on, not our internal identifier.
            market={marketName}
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
              // marketName, not marketId: this must name what was actually
              // requested from the gateway, or the log sends the next reader
              // looking for the wrong identifier.
              console.error(`[chart] getCandles failed for ${marketName}:`, e)
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
