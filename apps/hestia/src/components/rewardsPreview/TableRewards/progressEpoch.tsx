import { TIME_INTERVAL } from "@orderbook/core/constants";
import { secondsToHm } from "@orderbook/core/helpers";
import { Typography } from "@mitrabook/ux";
import classNames from "classnames";
import { useMemo } from "react";

type Props = {
  currentEpoch: number;
  blocksToNextEpoch: number;
};

export const ProgressEpoch = ({ currentEpoch, blocksToNextEpoch }: Props) => {
  const filledPercentage = useMemo(() => {
    const timeToNextEpoch = (blocksToNextEpoch || 0) * 12;
    const epochDuration = TIME_INTERVAL.epochDuration;

    const unfilledPercentage = (timeToNextEpoch / epochDuration) * 100;
    const filledPercentage = 100 - unfilledPercentage;

    return filledPercentage.toFixed(2);
  }, [blocksToNextEpoch]);

  return (
    <div className={classNames("flex items-center justify-between")}>
      <div className="flex items-center gap-4 flex-1">
        <div className="flex flex-col items-center justify-center border border-primary rounded-md px-2 py-3 min-w-16">
          <Typography.Text bold size="md">
            {currentEpoch}
          </Typography.Text>
          <Typography.Text size="xs" appearance="primary">
            Epoch
          </Typography.Text>
        </div>
        <div className="flex flex-1 flex-col">
          <Typography.Text bold size="md">
            In Progress
          </Typography.Text>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Typography.Text size="xs" appearance="primary">
                {filledPercentage}%
              </Typography.Text>
              <Typography.Text size="xs" appearance="primary">
                Claim after: {secondsToHm((blocksToNextEpoch || 0) * 12)}
              </Typography.Text>
            </div>
            <div className="w-full h-2 bg-level-2 rounded-full relative overflow-hidden">
              <div
                className="bg-primary-base absolute inset-0"
                style={{ width: `${filledPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
