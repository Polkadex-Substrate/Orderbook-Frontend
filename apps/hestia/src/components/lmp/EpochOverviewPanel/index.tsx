"use client";

import { Skeleton, Typography } from "@polkadex/ux";
import {
  RiTimeLine,
  RiMedalLine,
  RiCoinLine,
  RiStackLine,
} from "@remixicon/react";
import { useEffect, useState } from "react";
import { useTraderMetrics } from "@orderbook/core/hooks";
import { useAccountQScore } from "@orderbook/core/hooks";
import { UNIT } from "@orderbook/core/constants";

import { VolatilityMultiplierBadge } from "../VolatilityMultiplierBadge";

// 12 seconds per block on Polkadex
const BLOCK_TIME_S = 12;

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "Ended";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatPdex(raw: string): string {
  try {
    const val = Number(BigInt(raw) / (UNIT / BigInt(10_000))) / 10_000;
    return `${val.toFixed(2)} PDEX`;
  } catch {
    return "— PDEX";
  }
}

type StatCardProps = {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  loading?: boolean;
};

function StatCard({ icon, label, value, loading }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 py-4 px-5 flex-1 min-w-[10rem]">
      <div className="grid place-items-center bg-level-2 w-10 h-10 rounded-md flex-none">
        {icon}
      </div>
      <div className="flex flex-col gap-1">
        <Typography.Text size="xs" appearance="primary" className="whitespace-nowrap">
          {label}
        </Typography.Text>
        <Skeleton loading={!!loading} className="h-5 w-20">
          <Typography.Text bold className="whitespace-nowrap">
            {value}
          </Typography.Text>
        </Skeleton>
      </div>
    </div>
  );
}

type Props = { market: string };

export function EpochOverviewPanel({ market }: Props) {
  const { userMetrics, isLoading: metricsLoading } = useTraderMetrics(market);
  const { qScore, connected } = useAccountQScore(
    undefined // address passed from parent via context — see template.tsx
  );

  const [timeRemaining, setTimeRemaining] = useState<string>("—");

  useEffect(() => {
    if (!userMetrics?.blocksToNextEpoch) return;
    const update = () => {
      const totalSeconds = userMetrics.blocksToNextEpoch * BLOCK_TIME_S;
      setTimeRemaining(formatDuration(totalSeconds));
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [userMetrics?.blocksToNextEpoch]);

  const rankLabel =
    qScore
      ? `#${qScore.rank} / ${qScore.totalParticipants}`
      : "—";

  const estimatedReward =
    qScore ? formatPdex(qScore.estimatedReward) : "—";

  return (
    <div className="flex items-center justify-between gap-2 border-b border-secondary-base flex-wrap">
      <div className="flex items-center gap-3 px-5 py-4 border-r border-secondary-base min-w-[10rem]">
        <Typography.Text bold size="md">
          Epoch {userMetrics?.currentEpoch ?? "—"}
        </Typography.Text>
        {qScore?.volatilityMultiplierActive && (
          <VolatilityMultiplierBadge active />
        )}
      </div>
      <div className="flex items-center flex-1 flex-wrap divide-x divide-secondary-base">
        <StatCard
          icon={<RiTimeLine className="w-4 h-4" />}
          label="Time Remaining"
          value={timeRemaining}
          loading={metricsLoading}
        />
        <StatCard
          icon={<RiMedalLine className="w-4 h-4" />}
          label="Your Rank"
          value={rankLabel}
          loading={!connected}
        />
        <StatCard
          icon={<RiCoinLine className="w-4 h-4" />}
          label="Est. Reward"
          value={estimatedReward}
          loading={!connected}
        />
        <StatCard
          icon={<RiStackLine className="w-4 h-4" />}
          label="Q-Score"
          value={qScore ? parseFloat(qScore.qFinal).toFixed(4) : "—"}
          loading={!connected}
        />
      </div>
    </div>
  );
}
