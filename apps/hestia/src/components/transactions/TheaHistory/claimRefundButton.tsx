"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Typography } from "@polkadex/ux";

import { updateCrossChainTransactionStatus } from "@orderbook/core/index";

import { useHyperbridgeStatus } from "@/lib/hyperbridge/useHyperbridgeStatus";
import { claimRefund } from "@/lib/hyperbridge/claimRefund";
import type { Transaction } from "@/hooks";

const DELIVERY_LABELS: Record<string, string> = {
  SOURCE: "Confirming...",
  SOURCE_FINALIZED: "Source confirmed",
  HYPERBRIDGE_DELIVERED: "Routing...",
  HYPERBRIDGE_FINALIZED: "Delivering...",
};

const TIMEOUT_LABELS: Record<string, string> = {
  PENDING_TIMEOUT: "Awaiting timeout",
  DESTINATION_FINALIZED_TIMEOUT: "Timeout confirmed",
  HYPERBRIDGE_TIMED_OUT: "Processing refund",
};

/**
 * Renders the action cell for a cross-chain transaction row.
 *
 * - For PENDING transactions: polls Hyperbridge every 30 s and auto-syncs the BE
 *   when DESTINATION (success) or any timeout stage is reached.
 * - For TIMEDOUT transactions: shows the timeout progress and a "Claim Refund"
 *   button once the proof is available (HYPERBRIDGE_FINALIZED_TIMEOUT).
 * - For COMPLETED transactions: renders nothing.
 */
export const ClaimRefundButton = ({ transaction }: { transaction: Transaction }) => {
  const { status, commitment, transactionHash, address } = transaction;
  const [isClaiming, setIsClaiming] = useState(false);
  const queryClient = useQueryClient();
  // Separate guards per transition — a completed sync for one direction must not
  // block a subsequent sync for a different direction on the same component instance.
  const syncingDelivered = useRef(false);
  const syncingTimedOut = useRef(false);
  const syncingRefunded = useRef(false);

  const { data: hbStatus } = useHyperbridgeStatus(
    commitment,
    status !== "COMPLETED",
  );

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ["@orderbook", "crossChainTransactions", address],
    });
  }, [queryClient, address]);

  // PENDING → COMPLETED: Hyperbridge reached DESTINATION but BE still says PENDING.
  useEffect(() => {
    if (status !== "PENDING" || !hbStatus?.isDelivered || syncingDelivered.current) return;
    console.log(`[StatusSync] 🎉 ${transactionHash.slice(0, 10)}… delivered → updating BE to COMPLETED`);
    syncingDelivered.current = true;
    updateCrossChainTransactionStatus({
      transactionHash,
      status: "COMPLETED",
      address,
    })
      .then(() => {
        console.log(`[StatusSync] ✅ ${transactionHash.slice(0, 10)}… BE updated to COMPLETED`);
        invalidate();
      })
      .catch((e) => {
        console.error("[StatusSync] ❌ PENDING→COMPLETED failed:", e);
        syncingDelivered.current = false;
      });
  }, [hbStatus?.isDelivered, status, transactionHash, address, invalidate]);

  // PENDING → TIMEDOUT: Hyperbridge entered timeout flow but BE still says PENDING.
  useEffect(() => {
    if (status !== "PENDING" || !hbStatus?.isTimedOut || syncingTimedOut.current) return;
    console.log(`[StatusSync] ⏱️ ${transactionHash.slice(0, 10)}… timed out (${hbStatus.timeoutStage}) → updating BE to TIMEDOUT`);
    syncingTimedOut.current = true;
    updateCrossChainTransactionStatus({
      transactionHash,
      status: "TIMEDOUT",
      address,
    })
      .then(() => {
        console.log(`[StatusSync] ✅ ${transactionHash.slice(0, 10)}… BE updated to TIMEDOUT`);
        invalidate();
      })
      .catch((e) => {
        console.error("[StatusSync] ❌ PENDING→TIMEDOUT failed:", e);
        syncingTimedOut.current = false;
      });
  }, [hbStatus?.isTimedOut, status, transactionHash, address, invalidate]);

  // TIMEDOUT → COMPLETED: Hyperbridge reached TIMED_OUT (refund executed on-chain)
  // but BE still says TIMEDOUT — covers externally-submitted refunds.
  useEffect(() => {
    if (status !== "TIMEDOUT" || !hbStatus?.isRefunded || syncingRefunded.current) return;
    console.log(`[StatusSync] 💸 ${transactionHash.slice(0, 10)}… refund confirmed → updating BE to COMPLETED`);
    syncingRefunded.current = true;
    updateCrossChainTransactionStatus({
      transactionHash,
      status: "COMPLETED",
      address,
    })
      .then(() => {
        console.log(`[StatusSync] ✅ ${transactionHash.slice(0, 10)}… BE updated to COMPLETED`);
        invalidate();
      })
      .catch((e) => {
        console.error("[StatusSync] ❌ TIMEDOUT→COMPLETED failed:", e);
        syncingRefunded.current = false;
      });
  }, [hbStatus?.isRefunded, status, transactionHash, address, invalidate]);

  if (status === "COMPLETED") return null;

  if (status === "PENDING") {
    if (!hbStatus?.deliveryStage) return null;
    return (
      <Typography.Text size="xs" appearance="secondary">
        {DELIVERY_LABELS[hbStatus.deliveryStage] ?? hbStatus.deliveryStage}
      </Typography.Text>
    );
  }

  // status === "TIMEDOUT"

  if (hbStatus?.isRefunded) {
    return (
      <Typography.Text size="xs" appearance="success">
        Refunded
      </Typography.Text>
    );
  }

  if (hbStatus?.isRefundable) {
    const handleClaim = async () => {
      if (!commitment) return;
      try {
        setIsClaiming(true);
        console.log(`[ClaimRefund] 🚀 Submitting refund for ${transactionHash.slice(0, 10)}…`);
        const refundTxHash = await claimRefund(commitment);
        console.log(`[ClaimRefund] ✅ Refund tx submitted: ${refundTxHash}`);
        await updateCrossChainTransactionStatus({
          transactionHash,
          status: "COMPLETED",
          address,
        });
        console.log(`[ClaimRefund] ✅ BE updated to COMPLETED for ${transactionHash.slice(0, 10)}…`);
        invalidate();
      } catch (e) {
        console.error("[ClaimRefund] ❌ Failed:", e);
      } finally {
        setIsClaiming(false);
      }
    };

    return (
      <button
        disabled={isClaiming}
        onClick={handleClaim}
        className="px-2 py-1 text-xs rounded bg-actionInput text-white hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
      >
        {isClaiming ? "Claiming..." : "Claim Refund"}
      </button>
    );
  }

  return (
    <Typography.Text size="xs" appearance="attention">
      {hbStatus?.timeoutStage
        ? (TIMEOUT_LABELS[hbStatus.timeoutStage] ?? hbStatus.timeoutStage)
        : "Timed out"}
    </Typography.Text>
  );
};
