"use client";

import { useQuery } from "@tanstack/react-query";
import { createQueryClient, queryPostRequest } from "@hyperbridge/sdk";
import type { RequestStatusKey, TimeoutStatusKey } from "@hyperbridge/sdk";

// graphql-request requires an absolute URL (new URL(url) fails on relative paths).
// Use window.location.origin so the proxy URL resolves correctly in all envs
// (localhost:3000 in dev, the real domain in production).
// The proxy at /api/hyperbridge forwards to the real indexer server-side,
// avoiding the CORS block that happens on direct browser requests.
const _statusClient = createQueryClient({
  url:
    typeof window !== "undefined"
      ? `${window.location.origin}/api/hyperbridge`
      : (process.env.NEXT_PUBLIC_BRIDGE_INDEXER_URL ??
        "https://gargantua.indexer.polytope.technology"),
});

export interface HyperbridgeStatusResult {
  // Normal delivery stages (SOURCE → DESTINATION)
  deliveryStage: RequestStatusKey | null;
  isDelivered: boolean;             // DESTINATION reached = success
  // Timeout stages (PENDING_TIMEOUT → TIMED_OUT)
  timeoutStage: TimeoutStatusKey | null;
  isTimedOut: boolean;              // any timeout stage reached
  isRefundable: boolean;            // HYPERBRIDGE_TIMED_OUT reached = SDK can generate proof
  isRefunded: boolean;              // TIMED_OUT reached = refund complete
}

// The gargantua indexer only stores 5 statuses in requestStatusMetadata:
// SOURCE, HYPERBRIDGE_DELIVERED, DESTINATION, HYPERBRIDGE_TIMED_OUT, TIMED_OUT.
// Intermediate stages (SOURCE_FINALIZED, HYPERBRIDGE_FINALIZED, PENDING_TIMEOUT,
// DESTINATION_FINALIZED_TIMEOUT, HYPERBRIDGE_FINALIZED_TIMEOUT) are computed by
// the full SDK using state machine height queries — they are never written to the
// indexer.  We detect timed-out requests by comparing timeoutTimestamp directly.

const DELIVERY_ORDER: RequestStatusKey[] = [
  "SOURCE",
  "SOURCE_FINALIZED",
  "HYPERBRIDGE_DELIVERED",
  "HYPERBRIDGE_FINALIZED",
  "DESTINATION",
];

const TIMEOUT_ORDER: TimeoutStatusKey[] = [
  "PENDING_TIMEOUT",
  "DESTINATION_FINALIZED_TIMEOUT",
  "HYPERBRIDGE_TIMED_OUT",
  "HYPERBRIDGE_FINALIZED_TIMEOUT",
  "TIMED_OUT",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseStatuses(statuses: any[], timeoutTimestamp: bigint): HyperbridgeStatusResult {
  let deliveryIdx = -1;
  let timeoutIdx = -1;
  let deliveryStage: RequestStatusKey | null = null;
  let timeoutStage: TimeoutStatusKey | null = null;

  for (const s of statuses) {
    const dIdx = DELIVERY_ORDER.indexOf(s.status as RequestStatusKey);
    if (dIdx > deliveryIdx) {
      deliveryIdx = dIdx;
      deliveryStage = s.status as RequestStatusKey;
    }

    const tIdx = TIMEOUT_ORDER.indexOf(s.status as TimeoutStatusKey);
    if (tIdx > timeoutIdx) {
      timeoutIdx = tIdx;
      timeoutStage = s.status as TimeoutStatusKey;
    }
  }

  // The indexer only writes HYPERBRIDGE_TIMED_OUT / TIMED_OUT after the timeout
  // has propagated through the protocol — that can take minutes to hours.
  // We can detect expiry earlier by comparing the request's timeoutTimestamp
  // (Unix seconds) with the current wall clock.  If it has expired and the
  // request was not delivered, synthesize PENDING_TIMEOUT so the BE update
  // fires as soon as we notice the deadline has passed.
  const nowSec = BigInt(Math.floor(Date.now() / 1000));
  const isExpired =
    timeoutTimestamp > 0n &&
    nowSec >= timeoutTimestamp &&
    deliveryStage !== "DESTINATION";

  if (isExpired && timeoutIdx < 0) {
    timeoutStage = "PENDING_TIMEOUT";
    timeoutIdx = 0;
  }

  return {
    deliveryStage,
    isDelivered: deliveryStage === "DESTINATION",
    timeoutStage,
    isTimedOut: timeoutIdx >= 0,
    // HYPERBRIDGE_TIMED_OUT is stored in the indexer and means the timeout proof is
    // on Hyperbridge — at this point the SDK can generate calldata via the timeout stream.
    isRefundable: timeoutStage === "HYPERBRIDGE_TIMED_OUT",
    isRefunded: timeoutStage === "TIMED_OUT",
  };
}

/**
 * Polls the Hyperbridge indexer (HTTP only — no WS) for the current status of
 * a cross-chain request. Covers both the normal delivery flow (SOURCE →
 * DESTINATION) and the timeout flow (PENDING_TIMEOUT → TIMED_OUT).
 * Refetches every 30 s.
 */
export function useHyperbridgeStatus(
  commitment: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: ["hyperbridge-status", commitment],
    queryFn: async (): Promise<HyperbridgeStatusResult | null> => {
      const short = (commitment?.slice(0, 10) ?? "?") + "…";
      console.log(`[HyperbridgeStatus] 🔄 Polling ${short}`);

      let result: Awaited<ReturnType<typeof queryPostRequest>>;
      try {
        result = await queryPostRequest({
          commitmentHash: commitment as string,
          queryClient: _statusClient,
        });
      } catch (e) {
        console.error(`[HyperbridgeStatus] ❌ ${short} — indexer error:`, e);
        throw e;
      }

      if (!result) {
        console.log(`[HyperbridgeStatus] ⏳ ${short} — not indexed yet`);
        return null;
      }

      const rawStages = result.statuses.map((s: { status: string }) => s.status);
      console.log(`[HyperbridgeStatus] 📋 ${short} — stages:`, rawStages, `| timeoutTimestamp: ${result.timeoutTimestamp}`);

      const parsed = parseStatuses(result.statuses, result.timeoutTimestamp ?? 0n);
      console.log(`[HyperbridgeStatus] ✅ ${short} — parsed:`, {
        deliveryStage: parsed.deliveryStage,
        isDelivered: parsed.isDelivered,
        timeoutStage: parsed.timeoutStage,
        isTimedOut: parsed.isTimedOut,
        isRefundable: parsed.isRefundable,
        isRefunded: parsed.isRefunded,
      });

      return parsed;
    },
    enabled: enabled && !!commitment,
    refetchInterval: 30_000,
    staleTime: 25_000,
    retry: 2,
  });
}
