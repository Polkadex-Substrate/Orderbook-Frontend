"use client";

import { Skeleton, Typography } from "@polkadex/ux";
import { useAccountQScore } from "@orderbook/core/hooks";

const r = 50;
const cx = 60;
const cy = 60;
const arcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
const pathLength = Math.PI * r;

function scoreColor(value: number): string {
  if (value >= 0.7) return "stroke-green-500";
  if (value >= 0.4) return "stroke-yellow-500";
  return "stroke-red-500";
}

type GaugeProps = { value: number; label: string; loading?: boolean };

function Gauge({ value, label, loading }: GaugeProps) {
  const clamped = Math.max(0, Math.min(1, value));
  const offset = pathLength * (1 - clamped);

  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-[8rem]">
      <Skeleton loading={!!loading} className="w-full h-20 rounded-md">
        <svg viewBox="0 0 120 65" className="w-full max-w-[9rem]" aria-label={label}>
          {/* Background track */}
          <path
            d={arcPath}
            fill="none"
            strokeWidth={10}
            strokeLinecap="round"
            className="stroke-level-2"
          />
          {/* Value arc */}
          <path
            d={arcPath}
            fill="none"
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={pathLength}
            strokeDashoffset={offset}
            className={scoreColor(clamped)}
            style={{ transition: "stroke-dashoffset 0.5s ease-in-out" }}
          />
          {/* Percentage text */}
          <text
            x={cx}
            y={cy - 8}
            textAnchor="middle"
            fontSize="14"
            fontWeight="600"
            className="fill-current"
          >
            {(clamped * 100).toFixed(0)}%
          </text>
        </svg>
      </Skeleton>
      <Typography.Text size="xs" appearance="primary" className="text-center">
        {label}
      </Typography.Text>
    </div>
  );
}

type Props = { address: string | undefined };

export function QScoreGauges({ address }: Props) {
  const { qScore, connected } = useAccountQScore(address);
  const loading = !connected || !qScore;

  return (
    <div className="flex items-end justify-around gap-4 px-4 py-4 border-b border-secondary-base flex-wrap">
      <Gauge
        value={parseFloat(qScore?.depthScore ?? "0")}
        label="Depth / Spread"
        loading={loading}
      />
      <Gauge
        value={parseFloat(qScore?.uptimeScore ?? "0")}
        label="Uptime"
        loading={loading}
      />
      <Gauge
        value={parseFloat(qScore?.makerVolumeScore ?? "0")}
        label="Maker Volume"
        loading={loading}
      />
    </div>
  );
}
