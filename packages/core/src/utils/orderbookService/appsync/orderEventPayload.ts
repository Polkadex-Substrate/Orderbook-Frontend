/**
 * Parsing the websocket Order event, in both shapes it has ever had.
 *
 * THE BUG THIS FIXES: "Order completion message is not coming" - the report
 * that survived TWO earlier fixes, because both fixed real bugs that were not
 * this one.
 *
 * The engine's `publish_order` serialises `OrderEvent` with ABBREVIATED field
 * names, deliberately, to match the GraphQL query responses (see
 * Orderbook-Backend engine/src/appsync_client.rs):
 *
 *     { "type": "Order", "u": "...", "st": "CLOSED", "fq": "1.0", "s": "Bid",
 *       "ot": "LIMIT", "m": "PDEX-...", "p": "...", "q": "...", ... }
 *
 * The frontend's subscription mapper read the LONG names - `item.status`,
 * `item.filled_quantity`, `item.side`, `item.pair.base.asset` - which that
 * payload does not have. Every one of them came back undefined.
 *
 * WHY IT LOOKED LIKE IT WORKED. In the provider, `payload.status === "OPEN"`
 * was false (undefined), so the else-branch REMOVED the row from Open Orders -
 * which is the correct visible outcome for a fill, arrived at by accident. And
 * in orderUpdateNotice, an undefined status matches no branch, so the notice
 * was "none" and no toast, no notification, no sound ever fired. The dangerous
 * failures are the ones whose visible half works.
 *
 * WHY BOTH SHAPES ARE ACCEPTED. The engine used to serialise the raw Order
 * struct with long names, and switched. Parsing only the new shape does to a
 * rollback exactly what the old code did to the upgrade. Accepting both makes
 * the frontend indifferent to which engine build is live, and the day either
 * shape stops arriving entirely, nothing breaks.
 *
 * Import-free and pure, so real payloads can be pinned in tests verbatim.
 */

import type { OrderSide, OrderStatus, OrderType } from "../types";

/** Everything the provider needs from one Order event, market not yet resolved. */
export type ParsedOrderEvent = {
  user: string;
  /** `base-quote` asset-id pair, e.g. "PDEX-3496...". Resolve against the market list. */
  marketId: string;
  orderId: string;
  price: number;
  averagePrice: number;
  type: OrderType;
  status: OrderStatus;
  fee: number;
  /** Milliseconds. Feed to parseTimestampOrEpoch at the edge. */
  timestamp: number;
  side: OrderSide;
  filledQuantity: string;
  quantity: string;
};

const str = (v: unknown): string =>
  v === null || v === undefined ? "" : String(v);
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const STATUSES: readonly OrderStatus[] = ["OPEN", "CLOSED", "CANCELLED"];
const SIDES: readonly OrderSide[] = ["Ask", "Bid"];
const TYPES: readonly OrderType[] = ["LIMIT", "MARKET"];

const asStatus = (v: unknown): OrderStatus | null =>
  STATUSES.includes(v as OrderStatus) ? (v as OrderStatus) : null;
const asSide = (v: unknown): OrderSide | null =>
  SIDES.includes(v as OrderSide) ? (v as OrderSide) : null;
const asType = (v: unknown): OrderType | null =>
  TYPES.includes(v as OrderType) ? (v as OrderType) : null;

/**
 * Parse one Order event payload (already JSON.parsed), or null if it is
 * neither known shape.
 *
 * Null rather than a best-effort object: a payload we cannot classify must not
 * reach the notice logic as a soup of undefineds, because that is precisely the
 * failure this module replaces. The caller drops it and can say so once.
 */
export const parseOrderEvent = (raw: unknown): ParsedOrderEvent | null => {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Record<string, unknown>;

  // The ABBREVIATED shape, keyed on `st`: the current engine's OrderEvent.
  if ("st" in e) {
    const status = asStatus(e.st);
    const side = asSide(e.s);
    if (!status || !side) return null;
    const marketBuy =
      status !== "OPEN" && asType(e.ot) === "MARKET" && side === "Bid";
    return {
      user: str(e.u),
      marketId: str(e.m),
      orderId: str(e.id),
      price: num(e.p),
      averagePrice: num(e.afp),
      type: asType(e.ot) ?? "LIMIT",
      status,
      fee: num(e.fee),
      timestamp: num(e.t),
      side,
      filledQuantity: str(e.fq),
      // Same rule as the query mapper: a filled market buy is quantified by
      // its quote amount, because its base qty was unknown at placement.
      quantity: marketBuy ? str(e.qoq) : str(e.q),
    };
  }

  // The LONG shape: the raw Order struct the engine used to serialise.
  if ("status" in e) {
    const status = asStatus(e.status);
    const side = asSide(e.side);
    if (!status || !side) return null;
    const pair = e.pair as
      { base?: { asset?: unknown }; quote?: { asset?: unknown } } | undefined;
    return {
      user: str(e.user),
      marketId: `${str(pair?.base?.asset)}-${str(pair?.quote?.asset)}`,
      orderId: str(e.id),
      price: num(e.price),
      averagePrice: num(e.avg_filled_price),
      type: asType(e.order_type) ?? "LIMIT",
      status,
      fee: num(e.fee),
      timestamp: num(e.timestamp),
      side,
      filledQuantity: str(e.filled_quantity),
      quantity: str(e.qty),
    };
  }

  return null;
};
