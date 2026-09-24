"use client";

import { Skeleton, Typography } from "@polkadex/ux";
import { useLmpPairs, MarketTier, LMPPair } from "@orderbook/core/hooks";
import classNames from "classnames";

import { VolatilityMultiplierBadge } from "../VolatilityMultiplierBadge";

const TIERS: Array<MarketTier | "All"> = ["All", "Tier1", "Tier2", "Tier3"];

const TIER_LABELS: Record<MarketTier | "All", string> = {
  All: "All Markets",
  Tier1: "Tier 1",
  Tier2: "Tier 2",
  Tier3: "Tier 3",
};

function formatBps(bps: number): string {
  return `≤ ${bps} bps`;
}

type PairCardProps = {
  pair: LMPPair;
  selected: boolean;
  onSelect: (id: string) => void;
};

function PairCard({ pair, selected, onSelect }: PairCardProps) {
  return (
    <button
      onClick={() => onSelect(pair.id)}
      className={classNames(
        "flex flex-col gap-2 p-3 rounded-md border text-left transition-colors duration-150",
        selected
          ? "border-primary-base bg-level-1"
          : "border-secondary-base bg-level-0 hover:border-primary hover:bg-level-1"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <Typography.Text bold size="sm">
          {pair.id}
        </Typography.Text>
        <div className="flex items-center gap-1">
          {pair.dmmAssigned && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-level-2 text-actionInput border border-primary">
              DMM
            </span>
          )}
          <VolatilityMultiplierBadge active={pair.volatilityActive} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <Typography.Text size="xs" appearance="primary">Max Spread</Typography.Text>
          <Typography.Text size="xs" bold>{formatBps(pair.maxSpread)}</Typography.Text>
        </div>
      </div>
    </button>
  );
}

type Props = {
  selectedTier: MarketTier | "All";
  onTierChange: (tier: MarketTier | "All") => void;
  selectedPair: string;
  onPairSelect: (pair: string) => void;
};

export function MarketTierSelector({
  selectedTier,
  onTierChange,
  selectedPair,
  onPairSelect,
}: Props) {
  const { pairs, isLoading } = useLmpPairs();

  const filtered = selectedTier === "All"
    ? pairs
    : pairs.filter((p) => p.tier === selectedTier);

  return (
    <div className="flex flex-col border-b border-secondary-base">
      {/* Tier tabs */}
      <div className="flex items-center gap-0 border-b border-primary overflow-x-auto">
        {TIERS.map((tier) => (
          <button
            key={tier}
            onClick={() => onTierChange(tier)}
            className={classNames(
              "px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors duration-150",
              selectedTier === tier
                ? "border-primary-base text-current"
                : "border-transparent text-primary hover:text-current"
            )}
          >
            {TIER_LABELS[tier]}
          </button>
        ))}
      </div>

      {/* Pair cards */}
      <div className="flex items-center gap-2 p-3 overflow-x-auto">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} loading className="h-16 w-32 flex-none rounded-md" />
          ))
        ) : filtered.length === 0 ? (
          <Typography.Text appearance="primary" size="sm" className="px-2 py-3">
            No markets in this tier
          </Typography.Text>
        ) : (
          filtered.map((pair) => (
            <div key={pair.id} className="flex-none w-36">
              <PairCard
                pair={pair}
                selected={selectedPair === pair.id}
                onSelect={onPairSelect}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
