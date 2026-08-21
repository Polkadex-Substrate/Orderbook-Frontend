import { OrderSide } from "@orderbook/core/API";

export type BalanceUpdateEvent = {
  stid: number;
  asset: { asset: string } & string;
  free: string;
  user: string;
  pending_withdrawal: string;
  reserved: string;
};
export type CandleStickUpdateEvent = {
  o: string;
  c: string;
  h: string;
  l: string;
  vb: string;
  vq: string;
  t: string;
};

export type TransactionUpdateEvent = {
  stid: number;
  user: string;
  asset: string | { asset: string };
  fee: number;
  amount: number;
  status: "PENDING" | "CONFIRMED" | "FAILED";
  txn_type: "DEPOSIT" | "WITHDRAWAL";
  t: number;
  // only withdrawals with READY state will have snapshot_id
  snapshot_id?: number;
  isReverted: boolean | null;
};
/**
 * @deprecated UNUSED, KEPT AS DOCUMENTATION OF A BUG. This is the LONG-name
 * shape the mapper used to assume, while the engine actually sends the
 * abbreviated OrderEvent (st, fq, s, ot...). Reading this shape from that
 * payload made every field undefined, which silently killed all order fill
 * notifications. Parsing now lives in orderEventPayload.ts, which accepts both
 * shapes. Do not resume reading this type from the wire.
 */
export type OrderUpdateEvent = {
  stid: number;
  client_order_id: string;
  avg_filled_price: number;
  fee: number;
  filled_quantity: number;
  status: string;
  id: number;
  user: string;
  pair: Pair;
  side: string;
  order_type: string;
  qty: number;
  price: number;
  timestamp: number;
};
interface Pair {
  base: {
    asset: number;
  };
  quote: {
    asset: number;
  };
}
export type UserTradeEvent = {
  m: string;
  p: string;
  q: string;
  vq: string;
  t: number;
  trade_id: number;
  s: OrderSide;
};
export type TradeEvent = {
  m: string;
  p: string;
  q: string;
  t: number;
};
export type BookUpdateEvent = {
  i: number;
  m: string;
  b: Record<string, string>;
  a: Record<string, string>;
};

export type PlaceOrderPayload = {
  user: string;
  main_account: string;
  pair: string;
  side: Record<string, null>;
  order_type: Record<string, null>;
  qty: string;
  quote_order_quantity: string;
  price: string;
  timestamp: number;
  client_order_id: string;
};
