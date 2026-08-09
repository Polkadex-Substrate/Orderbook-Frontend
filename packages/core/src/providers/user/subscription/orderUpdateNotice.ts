/**
 * What should the user be told about this order update?
 *
 * THE REPORT
 * "There's no visual feedback when an order gets fulfilled instantly when
 * placed. This leaves the user confused on what happened to their order."
 *
 * THE CAUSE
 * The fill notice was gated on the order already being in the Open Orders list:
 *
 *   const findOrder = prevOpenOrders.find((o) => o.orderId === payload.orderId);
 *   ...
 *   if (findOrder && payload.status === "CLOSED") { notify filled }
 *
 * An order that fills IMMEDIATELY never enters Open Orders. The engine sends one
 * update with status CLOSED, `findOrder` is undefined, and the branch is skipped
 * entirely - so the user sees "Order placed", then nothing, and the order is not
 * in Open Orders either, because it is already closed. Every signal the UI has
 * says the order vanished.
 *
 * The gate was never needed: the notification is built from side, type, quantity
 * and market, all of which the PAYLOAD carries. `findOrder` was only ever used
 * as the source object, and using the payload instead is both correct and one
 * fewer thing that has to be true.
 *
 * The same gate silenced a marketable limit order that partially fills on entry
 * and rests for the remainder: it arrives as OPEN with a non-zero filled
 * quantity and no previous row, so `payload.filledQuantity > findOrder.filled`
 * could not be evaluated and nothing was said.
 *
 * Import-free so the rule is testable without a websocket or react-query.
 */

export type NoticeKind = "filled" | "partial" | "cancelled" | "none";

export type OrderLike = {
  orderId?: string;
  status?: string | null;
  /** Wire sends this as a string. */
  filledQuantity?: string | number | null;
  quantity?: string | number | null;
};

export type OrderNotice =
  | { kind: "filled" }
  | { kind: "partial" }
  | { kind: "cancelled" }
  | { kind: "none"; reason: string };

const qty = (value: unknown): number => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * Decide the notice for one order update.
 *
 * `previous` is the row already held in Open Orders, when there is one. It is
 * used ONLY to tell a fresh partial fill from a repeat of one already
 * announced - never to decide whether a fill happened at all.
 */
export const orderUpdateNotice = (
  payload: OrderLike | null | undefined,
  previous?: OrderLike | null
): OrderNotice => {
  if (!payload) return { kind: "none", reason: "no payload" };

  const status = payload.status;
  const filled = qty(payload.filledQuantity);

  if (status === "CANCELLED") return { kind: "cancelled" };

  if (status === "CLOSED") {
    // THE FIX: no `previous` required. An instantly-filled order has none.
    if (filled > 0) return { kind: "filled" };
    // Closed having filled nothing is not a fill. Saying "Filled" here would be
    // worse than silence.
    return { kind: "none", reason: "closed without filling anything" };
  }

  if (status === "OPEN") {
    if (filled <= 0)
      return { kind: "none", reason: "resting order, nothing filled yet" };

    // A partial fill on entry: no previous row exists, so the old comparison
    // could not run and the user was told nothing.
    if (!previous) return { kind: "partial" };

    // Only announce the increase, not every subsequent update carrying the same
    // total - otherwise a chatty stream repeats the same notice.
    return qty(previous.filledQuantity) < filled
      ? { kind: "partial" }
      : { kind: "none", reason: "no new fill since the last update" };
  }

  return { kind: "none", reason: `unhandled status: ${String(status)}` };
};
