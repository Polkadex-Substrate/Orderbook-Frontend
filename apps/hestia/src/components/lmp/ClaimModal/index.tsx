"use client";

import {
  Button,
  Spinner,
  Typography,
  truncateString,
} from "@polkadex/ux";
import {
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiExternalLinkLine,
} from "@remixicon/react";
import { usePolkadotExtrinsic, ExtrinsicStatus } from "@orderbook/core/hooks";
import { ClaimableReward } from "@orderbook/core/hooks";
import { UNIT } from "@orderbook/core/constants";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@orderbook/core/constants/queryKeys";
import { isMockLmpEnabled } from "@orderbook/core/lib/mockLmpData";
import { useCallback, useEffect, useRef } from "react";

function formatPdex(raw: string): string {
  try {
    const val = Number(BigInt(raw) / (UNIT / BigInt(10_000))) / 10_000;
    return `${val.toFixed(4)} PDEX`;
  } catch {
    return raw;
  }
}

function StatusIcon({ status }: { status: ExtrinsicStatus["status"] }) {
  if (status === "success")
    return <RiCheckboxCircleLine className="w-12 h-12 text-green-500" />;
  if (status === "error")
    return <RiErrorWarningLine className="w-12 h-12 text-red-500" />;
  return <Spinner.Keyboard className="w-8 h-8" />;
}

type Props = {
  reward: ClaimableReward;
  address: string;
  onClose: () => void;
};

export function ClaimModal({ reward, address, onClose }: Props) {
  const queryClient = useQueryClient();
  const { state, submit, reset } = usePolkadotExtrinsic();
  const mockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleConfirm = useCallback(() => {
    if (isMockLmpEnabled()) {
      // Simulate signing flow in mock mode without a real extrinsic
      // (usePolkadotExtrinsic would fail with no chain connection)
      return;
    }
    submit(
      (api) =>
        api.tx.ocex.claimRewards(
          reward.epoch,
          api.createType("u128", BigInt(reward.amount)),
          reward.merkleProof
        ),
      { successMessage: `Claimed ${formatPdex(reward.amount)}` }
    );
  }, [submit, reward]);

  // Mock success simulation
  useEffect(() => {
    if (!isMockLmpEnabled()) return;
    return () => {
      if (mockTimerRef.current) clearTimeout(mockTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (state.status === "success") {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lmpHistory(address) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lmpRewards("", address) });
    }
  }, [state.status, queryClient, address]);

  const isProcessing =
    state.status === "signing" || state.status === "submitted";
  const isDone = state.status === "success" || state.status === "error";

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget && !isProcessing) onClose(); }}
    >
      <div className="bg-backgroundBase border border-secondary-base rounded-xl w-full max-w-md mx-4 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-secondary-base">
          <Typography.Heading size="md">Claim Reward</Typography.Heading>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Reward summary */}
          {!isDone && (
            <>
              <div className="flex items-center justify-between bg-level-1 rounded-lg p-4">
                <div className="flex flex-col gap-1">
                  <Typography.Text size="xs" appearance="primary">Epoch {reward.epoch} · {reward.pair}</Typography.Text>
                  <Typography.Text bold size="lg">{formatPdex(reward.amount)}</Typography.Text>
                </div>
              </div>

              {/* Merkle proof summary */}
              <div className="flex flex-col gap-2 bg-level-0 border border-primary rounded-lg p-3">
                <Typography.Text size="xs" appearance="primary">Merkle Proof</Typography.Text>
                <Typography.Text size="xs" className="font-mono break-all">
                  {truncateString(reward.merkleLeaf, 10)}
                </Typography.Text>
                <Typography.Text size="xs" appearance="primary">
                  {reward.merkleProof.length} proof element{reward.merkleProof.length !== 1 ? "s" : ""}
                </Typography.Text>
              </div>
            </>
          )}

          {/* Processing / result state */}
          {isProcessing && (
            <div className="flex flex-col items-center gap-3 py-4">
              <StatusIcon status={state.status} />
              <Typography.Text appearance="primary">
                {state.status === "signing" ? "Waiting for signature…" : "Submitting transaction…"}
              </Typography.Text>
              {state.status === "submitted" && (
                <Typography.Text size="xs" appearance="primary" className="font-mono">
                  {truncateString(state.hash, 10)}
                </Typography.Text>
              )}
            </div>
          )}

          {state.status === "success" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <StatusIcon status="success" />
              <Typography.Text bold>Reward claimed!</Typography.Text>
              <a
                href={`https://polkadex.subscan.io/extrinsic/${state.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:text-current transition-colors"
              >
                View on explorer <RiExternalLinkLine className="w-3 h-3" />
              </a>
            </div>
          )}

          {state.status === "error" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <StatusIcon status="error" />
              <Typography.Text bold appearance="primary">{state.error}</Typography.Text>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {isDone || isProcessing ? (
              <Button.Solid
                className="flex-1"
                onClick={() => { reset(); onClose(); }}
                disabled={isProcessing}
              >
                {state.status === "success" ? "Done" : isProcessing ? "Processing…" : "Close"}
              </Button.Solid>
            ) : (
              <>
                <Button.Ghost className="flex-1" onClick={onClose}>
                  Cancel
                </Button.Ghost>
                <Button.Solid className="flex-1" onClick={handleConfirm}>
                  Confirm Claim
                </Button.Solid>
              </>
            )}
            {state.status === "error" && (
              <Button.Ghost className="flex-1" onClick={reset}>
                Retry
              </Button.Ghost>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
