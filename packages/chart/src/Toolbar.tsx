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
  /**
   * Does the loaded data actually support a VWAP right now?
   *
   * VWAP is undefined without volume, so on a market with no trades the overlay
   * draws nothing. The button used to light up regardless, which reads as a
   * broken toggle rather than as an absent measurement. Pass
   * `hasVwapData(candles)` and the button explains itself instead.
   *
   * Defaults to true so an integrator who does not pass it keeps the old
   * behaviour rather than getting a permanently disabled button.
   */
  vwapAvailable?: boolean;
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
  vwapAvailable = true,
}: ToolbarProps) {
  const emaOn = (indicators.ema?.length ?? 0) > 0;
  const vwapOn = !!indicators.vwap;
  // A daily or weekly bar is one bar per session, so a session-anchored VWAP
  // would just retrace the typical price of each bar - a line that says
  // nothing. Every exchange hides the option here rather than drawing it.
  const vwapMeaningless = resolution === "1D" || resolution === "1W";
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
        className={`${btn(vwapOn && vwapAvailable && !vwapMeaningless)} ${
          vwapMeaningless ? "opacity-40 cursor-not-allowed" : ""
        }`}
        disabled={vwapMeaningless}
        title={
          vwapMeaningless
            ? `VWAP is anchored to the session, so it carries no information on ${RESOLUTION_LABELS[resolution]} bars`
            : vwapOn && !vwapAvailable
              ? "VWAP unavailable - this market has no traded volume in the current session"
              : "Session VWAP (volume-weighted average price, anchored to the UTC day)"
        }
        onClick={() => onIndicators({ ...indicators, vwap: !vwapOn })}
      >
        VWAP
        {vwapOn && !vwapAvailable && !vwapMeaningless ? (
          <span className="ml-1 text-[10px] align-top">n/a</span>
        ) : null}
      </button>
      <button
        className={btn(!!indicators.rsi)}
        title="RSI 14 (Wilder), shown in a separate pane"
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
