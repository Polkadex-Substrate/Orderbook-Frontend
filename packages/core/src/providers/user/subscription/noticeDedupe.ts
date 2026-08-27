/**
 * Deciding whether an order notice has already been announced.
 *
 * THE REPORT (Bug 9): "Order Filled toast fires twice" - two identical toasts
 * for one fill, verified against Trade History as a single execution.
 *
 * WHY EVERY FILL ARRIVES TWICE
 * The engine publishes each order event to BOTH the user's channel and the
 * main account's channel (`tokio::join!(publish(user), publish(main))` in
 * appsync_client.rs), and the frontend subscribes to both - one subscription
 * updates the trade-address caches, the other the main-address caches. For a
 * user whose trading account IS their extension account, the two subscriptions
 * are the same channel, so they receive two copies of every event regardless.
 *
 * The cache writes are fine: they are keyed by address and idempotent. The
 * NOTICE is not - it is a side effect, and it fired once per copy.
 *
 * WHY DEDUPE RATHER THAN "ONLY NOTIFY ON THE TRADE-ADDRESS SUBSCRIPTION"
 * That simpler rule breaks the user who has NO local trading account: their
 * events arrive only on the main-address subscription, and gating notices to
 * the other one would silence their fills entirely - trading the duplicate
 * toast for the "no confirmation" bug this file's neighbours just fixed.
 * Deduplicating by event identity works for every account topology.
 *
 * The key is orderId + status + filledQuantity: two copies of the SAME event
 * collapse, while a later, genuinely new state of the same order (a second
 * partial fill, a cancel after a partial) differs in status or filled quantity
 * and is announced.
 *
 * Import-free and pure-ish (the store is caller-owned), so it is testable
 * without a websocket.
 */

/** Caller-owned state. Keep it in a ref; never recreate it per render. */
export type NoticeDedupeStore = {
  seen: Set<string>;
  /** Insertion order, so the set can be trimmed oldest-first. */
  order: string[];
};

export const createNoticeDedupeStore = (): NoticeDedupeStore => ({
  seen: new Set(),
  order: [],
});

/**
 * Bounded so a long session cannot grow it forever. 256 distinct order states
 * is far more than can be on screen, and the duplicates this exists to catch
 * arrive within milliseconds of each other.
 */
export const NOTICE_DEDUPE_LIMIT = 256;

/**
 * True exactly once per distinct order state.
 *
 * The second copy of the same state returns false, whatever channel it came in
 * on and in whatever order the two copies arrived.
 */
export const shouldAnnounceOrderState = (
  store: NoticeDedupeStore,
  event: {
    orderId?: string | null;
    status?: string | null;
    filledQuantity?: string | number | null;
  }
): boolean => {
  // An event with no order id cannot be deduplicated; announcing it is the
  // safer failure, since a lost notice is the bug this system just had.
  if (!event.orderId) return true;

  const key = `${event.orderId}|${event.status ?? ""}|${event.filledQuantity ?? ""}`;
  if (store.seen.has(key)) return false;

  store.seen.add(key);
  store.order.push(key);
  while (store.order.length > NOTICE_DEDUPE_LIMIT) {
    const oldest = store.order.shift();
    if (oldest) store.seen.delete(oldest);
  }
  return true;
};
