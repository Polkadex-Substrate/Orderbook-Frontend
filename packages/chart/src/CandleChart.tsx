"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ColorType,
  CrosshairMode,
  IChartApi,
  IPriceLine,
  ISeriesApi,
  LineStyle,
  UTCTimestamp,
  createChart,
} from "lightweight-charts";

import {
  Candle,
  CandleFeed,
  ChartTheme,
  ChartType,
  DARK_THEME,
  FillMark,
  IndicatorConfig,
  OrderMark,
  Resolution,
  resolutionToMs,
} from "./types";
import { ema, rsi, vwap } from "./indicators";

const HISTORY_BARS = 300;
const LOAD_MORE_THRESHOLD = 60;

const sec = (ms: number) => (ms / 1000) as UTCTimestamp;

export type CandleChartProps = {
  feed: CandleFeed;
  market: string;
  /** Display name for the watermark, e.g. "PDEX/USDT". */
  marketLabel?: string;
  resolution: Resolution;
  chartType?: ChartType;
  indicators?: IndicatorConfig;
  openOrders?: OrderMark[];
  fills?: FillMark[];
  theme?: ChartTheme;
  /** Height of the RSI pane when enabled. */
  rsiHeight?: number;
  onReady?: () => void;
  onError?: (e: Error) => void;
};

/** AppSync/Amplify rejects with plain objects ({ errors: [{ message }] }),
 *  which String() renders as "[object Object]". Extract something readable. */
function toError(e: unknown): Error {
  if (e instanceof Error) return e;
  const anyE = e as { errors?: { message?: string }[]; message?: string };
  const msg =
    anyE?.errors
      ?.map((x) => x?.message)
      .filter(Boolean)
      .join("; ") ||
    anyE?.message ||
    (() => {
      try {
        return JSON.stringify(e);
      } catch {
        return String(e);
      }
    })();
  return new Error(msg);
}

export function CandleChart({
  feed,
  market,
  marketLabel,
  resolution,
  chartType = "candles",
  indicators,
  openOrders,
  fills,
  theme = DARK_THEME,
  rsiHeight = 110,
  onReady,
  onError,
}: CandleChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi>();
  const rsiChartRef = useRef<IChartApi>();
  const mainSeriesRef = useRef<ISeriesApi<"Candlestick" | "Bar" | "Area">>();
  const volSeriesRef = useRef<ISeriesApi<"Histogram">>();
  const emaSeriesRef = useRef<Map<number, ISeriesApi<"Line">>>(new Map());
  const vwapSeriesRef = useRef<ISeriesApi<"Line">>();
  const rsiSeriesRef = useRef<ISeriesApi<"Line">>();
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const candlesRef = useRef<Candle[]>([]);
  const loadingOlderRef = useRef(false);
  const oldestRef = useRef<number | null>(null);
  const syncGuardRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const showRsi = !!indicators?.rsi;
  const emaPeriods = useMemo(
    () => indicators?.ema ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(indicators?.ema ?? [])]
  );

  /* ------------------------------------------------ chart lifecycle ---- */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: theme.background },
        textColor: theme.text,
      },
      grid: {
        vertLines: { color: theme.grid },
        horzLines: { color: theme.grid },
      },
      crosshair: { mode: CrosshairMode.Magnet },
      rightPriceScale: { borderColor: theme.grid },
      timeScale: {
        borderColor: theme.grid,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 6,
      },
      watermark: {
        visible: !!marketLabel,
        text: marketLabel ?? "",
        fontSize: 44,
        color: theme.watermark,
        horzAlign: "center",
        vertAlign: "center",
      },
      localization: { locale: "en-US" },
    });
    chartRef.current = chart;

    const volume = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });
    volume
      .priceScale()
      .applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    volSeriesRef.current = volume;

    return () => {
      chartRef.current = undefined;
      mainSeriesRef.current = undefined;
      volSeriesRef.current = undefined;
      emaSeriesRef.current.clear();
      vwapSeriesRef.current = undefined;
      priceLinesRef.current = [];
      chart.remove();
    };
    // Theme changes are rare; recreate for simplicity.
  }, [theme, marketLabel]);

  /* ------------------------------------------------ RSI pane ----------- */
  useEffect(() => {
    const el = rsiContainerRef.current;
    const main = chartRef.current;
    if (!showRsi || !el || !main) return;

    const pane = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: theme.background },
        textColor: theme.text,
      },
      grid: {
        vertLines: { color: theme.grid },
        horzLines: { color: theme.grid },
      },
      rightPriceScale: { borderColor: theme.grid },
      timeScale: { visible: false },
    });
    rsiChartRef.current = pane;
    const line = pane.addLineSeries({
      color: theme.accent,
      lineWidth: 2,
      priceLineVisible: false,
    });
    line.createPriceLine({
      price: 70,
      color: theme.down,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: false,
      title: "",
    });
    line.createPriceLine({
      price: 30,
      color: theme.up,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: false,
      title: "",
    });
    rsiSeriesRef.current = line;

    // Two-way time-scale sync (guard against feedback loops).
    const syncFrom = (src: IChartApi, dst: IChartApi) => () => {
      if (syncGuardRef.current) return;
      const range = src.timeScale().getVisibleLogicalRange();
      if (!range) return;
      syncGuardRef.current = true;
      dst.timeScale().setVisibleLogicalRange(range);
      syncGuardRef.current = false;
    };
    const mainToPane = syncFrom(main, pane);
    const paneToMain = syncFrom(pane, main);
    main.timeScale().subscribeVisibleLogicalRangeChange(mainToPane);
    pane.timeScale().subscribeVisibleLogicalRangeChange(paneToMain);

    // Seed with current data.
    if (candlesRef.current.length) {
      line.setData(
        rsi(candlesRef.current).map((p) => ({
          time: sec(p.time),
          value: p.value,
        }))
      );
      mainToPane();
    }

    return () => {
      main.timeScale().unsubscribeVisibleLogicalRangeChange(mainToPane);
      rsiChartRef.current = undefined;
      rsiSeriesRef.current = undefined;
      pane.remove();
    };
  }, [showRsi, theme]);

  /* ------------------------------------------------ series (re)build --- */
  const rebuildMainSeries = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;
    if (mainSeriesRef.current) {
      chart.removeSeries(mainSeriesRef.current);
      mainSeriesRef.current = undefined;
      priceLinesRef.current = [];
    }
    const series =
      chartType === "area"
        ? chart.addAreaSeries({
            lineColor: theme.accent,
            topColor: `${theme.accent}55`,
            bottomColor: `${theme.accent}08`,
            lineWidth: 2,
          })
        : chartType === "bars"
          ? chart.addBarSeries({ upColor: theme.up, downColor: theme.down })
          : chart.addCandlestickSeries({
              upColor: theme.up,
              downColor: theme.down,
              wickUpColor: theme.up,
              wickDownColor: theme.down,
              borderVisible: false,
            });
    mainSeriesRef.current = series as ISeriesApi<
      "Candlestick" | "Bar" | "Area"
    >;
    applyCandles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartType, theme]);

  const toSeriesData = (c: Candle) =>
    chartType === "area"
      ? { time: sec(c.time), value: c.close }
      : {
          time: sec(c.time),
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        };

  const applyCandles = useCallback(() => {
    const candles = candlesRef.current;
    const series = mainSeriesRef.current;
    if (!series) return;
    series.setData(candles.map(toSeriesData) as never[]);
    volSeriesRef.current?.setData(
      candles.map((c) => ({
        time: sec(c.time),
        value: c.volume,
        color: c.close >= c.open ? theme.volumeUp : theme.volumeDown,
      }))
    );
    refreshOverlays();
    refreshMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartType, theme, emaPeriods, indicators?.vwap, fills]);

  /* ------------------------------------------------ overlays ----------- */
  const OVERLAY_COLORS = ["#f5a623", "#a06bff", "#00b8d9", "#ff7ab6"];

  const refreshOverlays = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const candles = candlesRef.current;

    // EMA lines
    const wanted = new Set(emaPeriods);
    for (const [period, series] of emaSeriesRef.current) {
      if (!wanted.has(period)) {
        chart.removeSeries(series);
        emaSeriesRef.current.delete(period);
      }
    }
    emaPeriods.forEach((period, i) => {
      let series = emaSeriesRef.current.get(period);
      if (!series) {
        series = chart.addLineSeries({
          color: OVERLAY_COLORS[i % OVERLAY_COLORS.length],
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
        emaSeriesRef.current.set(period, series);
      }
      series.setData(
        ema(candles, period).map((p) => ({
          time: sec(p.time),
          value: p.value,
        }))
      );
    });

    // VWAP
    if (indicators?.vwap) {
      if (!vwapSeriesRef.current) {
        vwapSeriesRef.current = chart.addLineSeries({
          color: theme.text,
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
      }
      vwapSeriesRef.current.setData(
        vwap(candles).map((p) => ({ time: sec(p.time), value: p.value }))
      );
    } else if (vwapSeriesRef.current) {
      chart.removeSeries(vwapSeriesRef.current);
      vwapSeriesRef.current = undefined;
    }

    // RSI pane data
    if (rsiSeriesRef.current) {
      rsiSeriesRef.current.setData(
        rsi(candles).map((p) => ({ time: sec(p.time), value: p.value }))
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emaPeriods, indicators?.vwap, theme]);

  /* ------------------------------------------------ orders & fills ----- */
  useEffect(() => {
    const series = mainSeriesRef.current;
    if (!series) return;
    priceLinesRef.current.forEach((l) => series.removePriceLine(l));
    priceLinesRef.current = (openOrders ?? []).map((o) =>
      series.createPriceLine({
        price: o.price,
        color: o.side === "Bid" ? theme.up : theme.down,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `${o.side === "Bid" ? "BUY" : "SELL"} ${o.qty}`,
      })
    );
  }, [openOrders, theme, chartType, loading]);

  const refreshMarkers = useCallback(() => {
    const series = mainSeriesRef.current;
    if (!series) return;
    const marks = (fills ?? [])
      .slice()
      .sort((a, b) => a.time - b.time)
      .map((f) => ({
        time: sec(f.time),
        position:
          f.side === "Bid" ? ("belowBar" as const) : ("aboveBar" as const),
        shape: f.side === "Bid" ? ("arrowUp" as const) : ("arrowDown" as const),
        color: f.side === "Bid" ? theme.up : theme.down,
        text: `${f.side === "Bid" ? "B" : "S"} ${f.qty} @ ${f.price}`,
      }));
    series.setMarkers(marks);
  }, [fills, theme]);

  useEffect(() => {
    refreshMarkers();
  }, [refreshMarkers, loading]);

  /* ------------------------------------------------ data: load + live -- */
  useEffect(() => {
    if (!market || !chartRef.current) return;
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    candlesRef.current = [];
    oldestRef.current = null;

    const resMs = resolutionToMs(resolution);
    const to = new Date();
    const from = new Date(to.getTime() - HISTORY_BARS * resMs);

    feed
      .getCandles({ market, resolution, from, to })
      .then((bars) => {
        if (cancelled) return;
        candlesRef.current = bars;
        oldestRef.current = bars.length ? bars[0].time : null;
        rebuildMainSeries();
        chartRef.current?.timeScale().fitContent();
        setLoading(false);
        onReady?.();
      })
      .catch((e) => {
        if (cancelled) return;
        setLoading(false);
        setFailed(true);
        onError?.(toError(e));
      });

    const unsubscribe = feed.subscribe({
      market,
      resolution,
      onBar: (bar) => {
        if (cancelled) return;
        const candles = candlesRef.current;
        const last = candles[candles.length - 1];
        if (last && bar.time < last.time) return; // stale tick
        if (last && bar.time === last.time) candles[candles.length - 1] = bar;
        else candles.push(bar);
        mainSeriesRef.current?.update(toSeriesData(bar) as never);
        volSeriesRef.current?.update({
          time: sec(bar.time),
          value: bar.volume,
          color: bar.close >= bar.open ? theme.volumeUp : theme.volumeDown,
        });
        refreshOverlays(); // cheap at <=1k bars; keeps EMA/VWAP/RSI current
      },
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [market, resolution, feed]);

  /* Rebuild series when chart type changes (data preserved). */
  useEffect(() => {
    if (!loading) rebuildMainSeries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartType]);

  /* Refresh overlays when indicator config changes. */
  useEffect(() => {
    if (!loading) refreshOverlays();
  }, [refreshOverlays, loading]);

  /* ------------------------------------------------ infinite history --- */
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const onRange = () => {
      const range = chart.timeScale().getVisibleLogicalRange();
      if (!range || loadingOlderRef.current) return;
      if (range.from > LOAD_MORE_THRESHOLD) return;
      const oldest = oldestRef.current;
      if (!oldest) return;
      loadingOlderRef.current = true;
      const resMs = resolutionToMs(resolution);
      feed
        .getCandles({
          market,
          resolution,
          from: new Date(oldest - HISTORY_BARS * resMs),
          to: new Date(oldest - 1),
        })
        .then((older) => {
          if (older.length) {
            // Guard against overlap on bucket boundaries.
            const cutoff = candlesRef.current[0]?.time ?? Infinity;
            const fresh = older.filter((c) => c.time < cutoff);
            if (fresh.length) {
              candlesRef.current = [...fresh, ...candlesRef.current];
              oldestRef.current = candlesRef.current[0].time;
              applyCandles();
            } else {
              oldestRef.current = null; // no more history
            }
          } else {
            oldestRef.current = null;
          }
        })
        .catch(() => undefined)
        .finally(() => {
          loadingOlderRef.current = false;
        });
    };
    chart.timeScale().subscribeVisibleLogicalRangeChange(onRange);
    return () =>
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(onRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [market, resolution, feed, applyCandles]);

  /* ------------------------------------------------ render ------------- */
  return (
    <div className="relative flex flex-col w-full h-full min-h-[300px]">
      <div ref={containerRef} className="relative flex-1 min-h-[220px]" />
      {showRsi && (
        <div
          ref={rsiContainerRef}
          style={{ height: rsiHeight }}
          className="relative w-full border-t"
        />
      )}
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
        </div>
      )}
      {failed && !loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <p className="text-red-500 text-sm">Chart data not available</p>
        </div>
      )}
    </div>
  );
}
