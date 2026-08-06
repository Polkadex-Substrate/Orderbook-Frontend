"use client";
import {
  ChartType,
  IndicatorConfig,
  RESOLUTIONS,
  RESOLUTION_LABELS,
  Resolution,
} from "./types";

export type ToolbarProps = {
  resolution: Resolution;
  onResolution: (r: Resolution) => void;
  /**
   * Which resolutions to offer. Defaults to all of them.
   *
   * Not every datafeed serves every interval - the Polkadex gateway supports
   * 1, 5, 60 and 1D only - and a button that always errors is worse than an
   * absent one. This stays a prop rather than a constant here because it is a
   * property of the feed, not of the chart, and this package must not know
   * which backend it is pointed at.
   */
  resolutions?: readonly Resolution[];
  chartType: ChartType;
  onChartType: (t: ChartType) => void;
  indicators: IndicatorConfig;
  onIndicators: (i: IndicatorConfig) => void;
  showDepth?: boolean;
  onToggleDepth?: () => void;
};

const CHART_TYPES: { id: ChartType; label: string }[] = [
  { id: "candles", label: "Candles" },
  { id: "bars", label: "Bars" },
  { id: "area", label: "Area" },
];

const btn = (active: boolean) =>
  `px-2 py-1 rounded text-xs font-medium transition-colors ${
    active
      ? "bg-blue-600 text-white"
      : "text-gray-400 hover:text-white hover:bg-gray-800"
  }`;

/** Compact, dependency-free toolbar (tailwind classes; both apps use tailwind). */
export function Toolbar({
  resolution,
  onResolution,
  resolutions = RESOLUTIONS,
  chartType,
  onChartType,
  indicators,
  onIndicators,
  showDepth,
  onToggleDepth,
}: ToolbarProps) {
  const emaOn = (indicators.ema?.length ?? 0) > 0;
  return (
    <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 border-b border-gray-800">
      {resolutions.map((r) => (
        <button
          key={r}
          className={btn(r === resolution)}
          onClick={() => onResolution(r)}
        >
          {RESOLUTION_LABELS[r]}
        </button>
      ))}
      <span className="mx-1 h-4 w-px bg-gray-800" />
      {CHART_TYPES.map((t) => (
        <button
          key={t.id}
          className={btn(t.id === chartType)}
          onClick={() => onChartType(t.id)}
        >
          {t.label}
        </button>
      ))}
      <span className="mx-1 h-4 w-px bg-gray-800" />
      <button
        className={btn(emaOn)}
        title="EMA 20 / 50"
        onClick={() =>
          onIndicators({ ...indicators, ema: emaOn ? [] : [20, 50] })
        }
      >
        EMA
      </button>
      <button
        className={btn(!!indicators.vwap)}
        onClick={() => onIndicators({ ...indicators, vwap: !indicators.vwap })}
      >
        VWAP
      </button>
      <button
        className={btn(!!indicators.rsi)}
        onClick={() => onIndicators({ ...indicators, rsi: !indicators.rsi })}
      >
        RSI
      </button>
      {onToggleDepth && (
        <>
          <span className="mx-1 h-4 w-px bg-gray-800" />
          <button className={btn(!!showDepth)} onClick={onToggleDepth}>
            Depth
          </button>
        </>
      )}
    </div>
  );
}
