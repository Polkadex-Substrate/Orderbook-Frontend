"use client";

import {
  Button,
  GenericMessage,
  Skeleton,
  Spinner,
  Typography,
} from "@polkadex/ux";
import {
  RiCheckboxCircleLine,
  RiHandCoinLine,
} from "@remixicon/react";
import { useLMPHistory, ClaimableReward } from "@orderbook/core/hooks";
import { UNIT } from "@orderbook/core/constants";
import classNames from "classnames";
import { useState } from "react";

import { ClaimModal } from "../ClaimModal";

function formatPdex(raw: string): string {
  try {
    const val = Number(BigInt(raw) / (UNIT / BigInt(10_000))) / 10_000;
    return `${val.toFixed(4)} PDEX`;
  } catch {
    return raw;
  }
}

type RewardRowProps = {
  reward: ClaimableReward;
  address: string;
};

function RewardRow({ reward, address }: RewardRowProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div
        className={classNames(
          "flex items-center justify-between gap-4 p-3 rounded-lg border",
          reward.claimed
            ? "border-secondary-base opacity-50"
            : "border-primary bg-level-0"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center justify-center border border-primary rounded-md px-2.5 py-2 min-w-[3rem] flex-none">
            <Typography.Text bold size="sm">{reward.epoch}</Typography.Text>
            <Typography.Text size="xs" appearance="primary">Epoch</Typography.Text>
          </div>
          <div className="flex flex-col gap-0.5">
            <Typography.Text bold size="sm">{formatPdex(reward.amount)}</Typography.Text>
            <Typography.Text size="xs" appearance="primary">{reward.pair}</Typography.Text>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {reward.claimed ? (
            <div className="flex items-center gap-1">
              <RiCheckboxCircleLine className="w-4 h-4 text-green-500" />
              <Typography.Text size="xs" appearance="primary">Claimed</Typography.Text>
            </div>
          ) : (
            <Button.Solid size="sm" onClick={() => setModalOpen(true)}>
              <RiHandCoinLine className="w-3 h-3" />
              Claim
            </Button.Solid>
          )}
        </div>
      </div>

      {modalOpen && (
        <ClaimModal
          reward={reward}
          address={address}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}

type Props = { address: string | undefined };

export function LMPHistoryTab({ address }: Props) {
  const { history, isLoading } = useLMPHistory(address);

  if (!address) {
    return (
      <GenericMessage
        title="Connect wallet to view history"
        illustration="ConnectWallet"
        className="bg-level-1 min-h-[200px]"
        imageProps={{ className: "w-16 self-center" }}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 p-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} loading className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <GenericMessage
        title="No LMP history yet"
        illustration="NoResultFound"
        className="bg-level-1 min-h-[200px]"
        imageProps={{ className: "w-16 self-center" }}
      />
    );
  }

  const unclaimed = history.filter((r) => !r.claimed);
  const claimed = history.filter((r) => r.claimed);

  return (
    <div className="flex flex-col gap-4 p-3 overflow-y-auto">
      {unclaimed.length > 0 && (
        <div className="flex flex-col gap-2">
          <Typography.Text size="xs" appearance="primary" className="px-1">
            Ready to claim
          </Typography.Text>
          {unclaimed.map((r) => (
            <RewardRow key={`${r.epoch}-${r.pair}`} reward={r} address={address} />
          ))}
        </div>
      )}
      {claimed.length > 0 && (
        <div className="flex flex-col gap-2">
          <Typography.Text size="xs" appearance="primary" className="px-1">
            Claimed
          </Typography.Text>
          {claimed.map((r) => (
            <RewardRow key={`${r.epoch}-${r.pair}`} reward={r} address={address} />
          ))}
        </div>
      )}
    </div>
  );
}
