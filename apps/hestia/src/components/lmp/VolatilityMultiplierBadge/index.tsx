"use client";

import { Typography } from "@polkadex/ux";
import { RiFlashlightLine } from "@remixicon/react";
import classNames from "classnames";

type Props = { active: boolean; className?: string };

export function VolatilityMultiplierBadge({ active, className }: Props) {
  if (!active) return null;

  return (
    <div
      className={classNames(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5",
        "bg-orange-500/15 border border-orange-500/40 animate-pulse",
        className
      )}
    >
      <RiFlashlightLine className="w-3 h-3 text-orange-400" />
      <Typography.Text size="xs" className="text-orange-400 font-medium whitespace-nowrap">
        2× Active
      </Typography.Text>
    </div>
  );
}
