"use client";

import { RiFileCopyLine, RiHandCoinLine, RiSortAsc } from "@remixicon/react";
import {
  Copy,
  Icon,
  Skeleton,
  Typography,
  truncateString,
} from "@mitrabook/ux";
import { useMemo, useRef } from "react";
import { useResizeObserver } from "usehooks-ts";
import { useProfile } from "@orderbook/core/providers/user/profile";
import { useConnectWalletProvider } from "@orderbook/core/providers/user/connectWalletProvider";
import {
  useClaimReward,
  useClaimableRewards,
  useTraderMetrics,
} from "@orderbook/core/hooks";
import { trimFloat, millify } from "@aksumite/numericals";

import { RewardsSkeleton } from "./loading";
import { ClaimReward } from "./claimReward";
import { ProgressEpoch } from "./progressEpoch";

import { Icons } from "@/components/ui";

type Props = { maxHeight: string; market: string };

// Plain component: was forwardRef but ignored the ref and no caller
// passed one — triggered React's forwardRef-arity warning on mount.
export const TableRewards = ({ maxHeight, market }: Props) => {
  const titleRef = useRef(null);

  const { height: titleHeight = 0 } = useResizeObserver({
    ref: titleRef,
    box: "border-box",
  });

  const { selectedWallet } = useConnectWalletProvider();
  const {
    selectedAddresses: { mainAddress },
  } = useProfile();

  const { userMetrics, isLoading: isUserMetricsLoading } =
    useTraderMetrics(market);

  const { claimableRewards, isLoading: isRewardsLoading } =
    useClaimableRewards(market);

  const {
    mutateAsync: onClaimReward,
    status: claimRewardStatus,
    loadingEpochs,
  } = useClaimReward();

  const accumulatedRewards = useMemo(() => {
    const rewards = claimableRewards?.map((r) => r.totalReward) || [];
    if (rewards.length === 0) return 0;
    return rewards?.reduce((a, b) => a + b).toFixed(4);
  }, [claimableRewards]);

  const tableMaxHeight = useMemo(
    () => `${maxHeight.slice(0, -1)} - ${titleHeight}px)`,
    [maxHeight, titleHeight]
  );

  return (
    <div className="flex-1 flex flex-col border-b border-secondary-base">
      <div
        ref={titleRef}
        className="flex sm:!flex-row flex-col items-center justify-between gap-4 bg-level-1 border-b border-primary px-4 py-6 flex-wrap"
      >
        <div className="flex items-center gap-3 self-start">
          <Icon name="Avatar" className="w-10 h-10" />
          <div className="flex flex-col">
            <Typography.Text bold size="md">
              {selectedWallet?.name || "Unknown account"}
            </Typography.Text>
            <Copy value={mainAddress}>
              <div className="flex items-center gap-1">
                <RiFileCopyLine className="w-4 h-4 text-actionInput" />
                <Typography.Text appearance="primary">
                  {truncateString(mainAddress || "0xxxxxxxxxxxxx", 6)}
                </Typography.Text>
              </div>
            </Copy>
          </div>
        </div>
        <div className="flex items-center gap-8 self-start flex-wrap">
          <div className="flex items-center gap-2">
            <div className="grid place-items-center bg-level-2 w-10 h-10 rounded-md">
              <RiSortAsc className="w-4 h-4" />
            </div>
            <div className="flex flex-col gap-1">
              <Typography.Text
                size="xs"
                appearance="primary"
                className="whitespace-nowrap"
              >
                My MM score
              </Typography.Text>
              <Skeleton
                loading={isUserMetricsLoading}
                className="h-4 w-16 flex-none"
              >
                <Typography.Text bold className="whitespace-nowrap">
                  {millify(userMetrics?.mmScore || 0)}
                </Typography.Text>
              </Skeleton>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="grid place-items-center bg-level-2 w-10 h-10 rounded-md">
              <Icons.Transfer className="w-4 h-4" />
            </div>
            <div className="flex flex-col gap-1">
              <Typography.Text
                size="xs"
                appearance="primary"
                className="whitespace-nowrap"
              >
                My Trading score
              </Typography.Text>
              <Skeleton
                loading={isUserMetricsLoading}
                className="h-4 w-16 flex-none"
              >
                <Typography.Text bold className="whitespace-nowrap">
                  {trimFloat({
                    value: userMetrics?.tradingScore || 0,
                    digitsAfterDecimal: 6,
                  })}
                </Typography.Text>
              </Skeleton>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="grid place-items-center bg-level-2 w-10 h-10 rounded-md">
              <RiHandCoinLine className="w-4 h-4" />
            </div>
            <div className="flex flex-col gap-1">
              <Typography.Text
                size="xs"
                appearance="primary"
                className="whitespace-nowrap"
              >
                Total rewards (PDEX)
              </Typography.Text>
              <Skeleton
                loading={isRewardsLoading}
                className="h-4 w-16 flex-none"
              >
                <Typography.Text bold className="whitespace-nowrap">
                  {accumulatedRewards}
                </Typography.Text>
              </Skeleton>
            </div>
          </div>
        </div>
      </div>

      {isRewardsLoading || isUserMetricsLoading ? (
        <RewardsSkeleton />
      ) : (
        <div
          className="overflow-y-hidden hover:overflow-y-auto p-3 scrollbar-hide min-h-[450px]"
          style={{ maxHeight: tableMaxHeight, scrollbarGutter: "stable" }}
        >
          <div className="flex flex-col gap-4">
            <ProgressEpoch
              blocksToNextEpoch={userMetrics?.blocksToNextEpoch || 0}
              currentEpoch={userMetrics?.currentEpoch || 0}
            />

            {claimableRewards?.map((value) => {
              return (
                <ClaimReward
                  key={value.epoch}
                  value={value}
                  market={market}
                  claimRewardStatus={claimRewardStatus}
                  loadingEpochs={loadingEpochs}
                  onClaimReward={onClaimReward}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
