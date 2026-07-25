"use client";
/**
 * GraphV2 — orderbook-native chart (no external datafeed gateway).
 *
 * Candles come from the exchange's own AppSync klines via @orderbook/core
 * (fetchCandles) with live updates over the kline subscription; depth from
 * useOrderbook; the user's open orders and fills are drawn on the chart.
 *
 * Enabled with NEXT_PUBLIC_NATIVE_CHART=true (see Graph/index.tsx).
 */
import { useMemo, useState } from "react";
import { useWindowSize } from "react-use";
import { fetchCandles } from "@orderbook/core/helpers";
import {
  useOpenOrders,
  useOrderbook,
  useTradeHistory,
} from "@orderbook/core/hooks";
import { useSubscription } from "@orderbook/core/providers/user/subscription";
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
} from "@orderbook/chart";

const DEPTH_LEVELS = 40;
const FILLS_LIMIT = 30;

export const GraphV2 = ({ currentMarket }: { currentMarket?: Market }) => {
  const marketId = currentMarket?.id ?? "";
  const marketName = currentMarket?.name ?? "";

  const [resolution, setResolution] = useState<Resolution>("60");
  const [chartType, setChartType] = useState<ChartType>("candles");
  const [indicators, setIndicators] = useState<IndicatorConfig>({});
  const [showDepth, setShowDepth] = useState(false);

  const { onCandleSubscribe } = useSubscription();

  // Ultrawide/4K: enough room to dock the depth chart beside the candles
  // permanently instead of hiding it behind the toolbar toggle.
  const { width } = useWindowSize();
  const superWide = width >= 2200;

  /** Adapter: @orderbook/core primitives -> CandleFeed. */
  const feed = useMemo<CandleFeed>(
    () => ({
      getCandles: ({ market, resolution: r, from, to }) =>
        fetchCandles({ market, resolution: r, from, to }),
      subscribe: ({ market, resolution: r, onBar }) => {
        onCandleSubscribe({
          market,
          interval: r,
          onUpdateTradingViewRealTime: onBar,
        });
        // core's subscription API exposes no teardown; CandleChart guards
        // against stale ticks itself (checks bar.time against loaded data).
        return () => undefined;
      },
    }),
    [onCandleSubscribe]
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
