/**
 * Keep the order book honest about the increments it has and has not seen.
 *
 * THE REPORT
 * "I placed a buy order and it was not reflected in the orderbook instantly,
 * even though the notification was instant. I placed a sell order, and then the
 * previous buy order showed up together with it."
 *
 * WHAT MAKES THAT POSSIBLE
 * The book is a snapshot plus a stream of increments. Every increment already
 * carries a sequence number - `convertBookUpdatesToPriceLevels` copies the
 * event's `i` onto every level as `seqNum` - and `onOrderbookUpdates` threw it
 * away. So the client had no way to notice either of these:
 *
 *   1. A DROPPED OR OUT-OF-ORDER INCREMENT. Nothing detects the gap, so the
 *      book silently diverges from the engine and stays wrong until the 30s
 *      `refetchInterval` in useOrderbook happens to pull a fresh snapshot. Two
 *      orders appearing "together" is what that looks like from the outside:
 *      the second order did not fix the first, the poll did.
 *   2. A SNAPSHOT LANDING AFTER AN INCREMENT. useOrderbook's queryFn replaces
 *      the whole cache entry. An increment applied while that fetch is in
 *      flight is overwritten by a snapshot taken BEFORE the order existed.
 *
 * Both produce exactly one symptom: a resting order that is missing from the
 * book while the engine has already acknowledged it.
 *
 * WHAT THIS DOES NOT DO
 * It does not reorder or buffer. The engine's snapshot endpoint returns no
 * sequence number of its own (getOrderbook maps price/qty only), so there is no
 * anchor to replay against. Without that anchor the honest move is to detect
 * divergence and RESYNC - refetch the snapshot - rather than to pretend the
 * local book is authoritative. A self-healing wrong book beats a permanently
 * wrong one, and the resync count is the evidence that says whether increments
 * are being dropped at all.
 *
 * Import-free so it is testable without a websocket.
 */

export type SeqState = {
  /** Highest sequence number applied so far, or null before the first one. */
  lastSeq: number | null;
};

export type SeqDecision =
  /** Apply these levels; the stream is contiguous. */
  | { action: "apply"; nextSeq: number | null }
  /** Already applied, or older than what we have. Drop silently. */
  | { action: "skip"; reason: string; nextSeq: number | null }
  /** A gap: the local book cannot be trusted. Refetch the snapshot. */
  | { action: "resync"; reason: string; nextSeq: null };

export const initialSeqState = (): SeqState => ({ lastSeq: null });

/**
 * The sequence number carried by a batch of levels.
 *
 * One websocket event fans out into several PriceLevel entries that all share
 * the event's `i`, so any of them will do - but they are read defensively and
 * the maximum is taken, because a batch that somehow mixes events should be
 * judged by its newest member rather than by whichever happened to be first.
 *
 * Returns null when no level carries one, which is the pre-seqNum wire format.
 */
export const batchSeq = (
  levels: readonly { seqNum?: number | null }[] | null | undefined
): number | null => {
  let max: number | null = null;
  for (const level of levels ?? []) {
    const n = level?.seqNum;
    if (n === null || n === undefined || !Number.isFinite(n)) continue;
    if (max === null || n > max) max = n;
  }
  return max;
};

/**
 * Decide what to do with an incoming batch.
 *
 * The first batch after a (re)connect is always applied and becomes the
 * baseline: without a snapshot sequence there is nothing to validate it
 * against, and refusing it would leave the book frozen forever.
 */
export const nextSeqDecision = (
  state: SeqState,
  levels: readonly { seqNum?: number | null }[] | null | undefined
): SeqDecision => {
  const seq = batchSeq(levels);

  // The wire format has no sequence number. Apply, and stay in the
  // pre-sequencing behaviour rather than resyncing on every message.
  if (seq === null)
    return {
      action: "apply",
      nextSeq: state.lastSeq,
    };

  if (state.lastSeq === null) return { action: "apply", nextSeq: seq };

  if (seq <= state.lastSeq)
    return {
      action: "skip",
      reason: `increment ${seq} is not newer than the last applied ${state.lastSeq}`,
      nextSeq: state.lastSeq,
    };

  if (seq === state.lastSeq + 1) return { action: "apply", nextSeq: seq };

  return {
    action: "resync",
    reason: `gap in the book stream: expected ${state.lastSeq + 1}, received ${seq} (${seq - state.lastSeq - 1} increment(s) missing)`,
    nextSeq: null,
  };
};
