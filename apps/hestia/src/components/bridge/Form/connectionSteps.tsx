"use client";

import { Typography } from "@mitrabook/ux";
import { RiCheckLine } from "@remixicon/react";
import classNames from "classnames";

/**
 * Two-dot progress strip for the bridge's account requirements.
 *
 * A bridge needs a wallet on BOTH sides, but the form only ever asks for one
 * at a time. Users connected the source, saw the primary button change to
 * "Connect <other chain> wallet", and read it as the first connection having
 * failed. Showing both requirements up front makes the second one expected
 * rather than a surprise.
 *
 * Renders nothing once both are satisfied: it is scaffolding for setup, not
 * permanent chrome.
 */
export const ConnectionSteps = ({
  sourceLabel,
  destinationLabel,
  sourceDone,
  destinationDone,
}: {
  sourceLabel: string;
  destinationLabel: string;
  sourceDone: boolean;
  destinationDone: boolean;
}) => {
  if (sourceDone && destinationDone) return null;

  const steps = [
    { label: sourceLabel, done: sourceDone },
    { label: destinationLabel, done: destinationDone },
  ];

  return (
    <div className="flex items-center gap-3 px-1 pb-1">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span
              className={classNames(
                "grid place-content-center w-4 h-4 rounded-full text-[10px] font-semibold shrink-0 transition-colors",
                step.done
                  ? "bg-primary-base text-white"
                  : "border border-secondary text-secondary"
              )}
            >
              {step.done ? <RiCheckLine className="w-3 h-3" /> : i + 1}
            </span>
            <Typography.Text
              size="xs"
              appearance={step.done ? "secondary" : "primary"}
              className={classNames(step.done && "line-through opacity-60")}
            >
              {step.label}
            </Typography.Text>
          </div>
          {i === 0 && <span className="w-6 h-px bg-secondary/40" />}
        </div>
      ))}
    </div>
  );
};
