/**
 * Saying how much of an order actually filled.
 *
 * THE BUG THIS FIXES, reported 1 September 2026 with a full balance
 * reconciliation attached.
 *
 * A tester rested a Sell for 3 PDEX @ 0.52, then filled 2.5 of it. The leftover
 * 0.5 PDEX was worth 0.26 USDT, below the exchange's ~1 USDT minimum, so the
 * engine force-cancelled the remainder and credited it back. Reasonable
 * behaviour. What the app said about it was not:
 *
 *     Limit Sell Order Filled
 *     Filled exchange limit sell order for 3 PDEX by using USDT.
 *
 * Trade History - the authoritative record - showed 2.5 PDEX on both sides, and
 * a before/after reconciliation put the total PDEX conserved to within a
 * trading fee. Nothing was lost. The notification simply reported the wrong
 * number, and no message anywhere said the remaining 0.5 had been cancelled.
 *
 * THE CAUSE, and it is one word
 * `NOTIFICATIONS.filledOrder` and `partialFilledOrder` both interpolated
 * `order.quantity` - the size the order was PLACED at - instead of
 * `order.filledQuantity`, the size that actually traded. For an order that
 * fills completely those are equal, which is why this survived: every ordinary
 * fill looks correct, and only a partial with a cancelled remainder exposes it.
 *
 * WHY THIS IS MAJOR RATHER THAN COSMETIC
 * A trader reading the toast rather than reconciling Trade History believes
 * they sold 3 PDEX when they sold 2.5. The number is not approximate, it is
 * wrong, and it is wrong in the direction of overstating execution.
 *
 * Import-free and pure so every shape is testable without a websocket.
 */

/** Just the fields this needs. Wire sends both as strings. */
export type FillLike = {
  quantity?: string | number | null;
  filledQuantity?: string | number | null;
};

export type FillAmounts = {
  /** How much actually traded. */
  filled: number;
  /** How much the order was placed for. */
  ordered: number;
  /** Placed minus filled, never negative. */
  remainder: number;
  /** Did the whole order trade? */
  complete: boolean;
};

const num = (value: unknown): number => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export const fillAmounts = (
  order: FillLike | null | undefined
): FillAmounts => {
  const filled = num(order?.filledQuantity);
  const ordered = num(order?.quantity);
  /*
   * `ordered` can legitimately be 0 or missing on some payload shapes, and a
   * market order's "quantity" may be denominated differently from its fill.
   * Treat anything that would imply a negative remainder as complete rather
   * than inventing a shortfall out of a data quirk - overstating a cancellation
   * is the same class of lie as overstating a fill.
   */
  const remainder = ordered > filled ? ordered - filled : 0;
  return { filled, ordered, remainder, complete: remainder === 0 };
};

/**
 * Trim a quantity for display without lying about it.
 *
 * `String(0.5)` is fine, but `String(1e-8)` is "1e-8" and small remainders are
 * exactly where this function gets used. Fixed notation, trailing zeros gone.
 */
export const formatQty = (n: number): string => {
  if (!Number.isFinite(n)) return "0";
  if (n === 0) return "0";
  if (Math.abs(n) < 0.00000001) return "<0.00000001";
  return n.toFixed(8).replace(/\.?0+$/, "");
};

/**
 * The sentence describing what traded.
 *
 * Three cases, and the third is the one that was missing entirely:
 *
 *   complete            "Filled ... for 3 PDEX"
 *   still resting       "Filled 2.5 of 3 PDEX"
 *   remainder cancelled "Filled 2.5 of 3 PDEX; the remaining 0.5 PDEX was
 *                        cancelled (below the minimum order size)"
 *
 * The tester asked for exactly this: the cancellation "happens completely
 * silently, bundled invisibly inside a notification that claims full
 * execution."
 */
export const describeFill = ({
  order,
  baseTicker,
  quoteTicker,
  closed,
}: {
  order: FillLike | null | undefined;
  baseTicker: string;
  quoteTicker: string;
  /** True when the order is CLOSED, so any remainder is gone for good. */
  closed: boolean;
}): string => {
  const { filled, ordered, remainder, complete } = fillAmounts(order);

  if (complete)
    return `Filled ${formatQty(filled)} ${baseTicker} by using ${quoteTicker}.`;

  const head = `Filled ${formatQty(filled)} of ${formatQty(ordered)} ${baseTicker} by using ${quoteTicker}.`;

  // Only claim a cancellation when the order is actually finished. A resting
  // partial fill may still fill the rest, and saying it was cancelled would be
  // the same mistake in the opposite direction.
  return closed
    ? `${head} The remaining ${formatQty(remainder)} ${baseTicker} was cancelled (below the minimum order size).`
    : `${head} The remaining ${formatQty(remainder)} ${baseTicker} is still open.`;
};

/**
 * The toast TITLE. A closed order that did not fully fill is not "Filled".
 *
 * The reported toast said "Order Filled" for an order that filled five sixths
 * of the way and then had its tail cancelled. The title is the part most people
 * read, so it carries the distinction too.
 */
export const fillTitle = ({
  order,
  typeLabel,
  sideLabel,
  closed,
}: {
  order: FillLike | null | undefined;
  typeLabel: string;
  sideLabel: string;
  closed: boolean;
}): string => {
  const { complete } = fillAmounts(order);
  if (complete) return `${typeLabel} ${sideLabel} Order Filled 🎉`;
  return closed
    ? `${typeLabel} ${sideLabel} Order Partially Filled`
    : `${typeLabel} ${sideLabel} Order Partially Filled`;
};
