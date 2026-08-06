// number type can be used for all calculations as it supports up to 15 digits after decimal point
// while max precision of backend is 8 digits after decimal point

import { USER_EVENTS } from "@orderbook/core/constants";

export interface MarketBase {
  id: string; // eg: "123-231"
  name: string; // eg: "BTC/USDT"
  baseAsset: Asset;
  quoteAsset: Asset;
}

export interface Market extends MarketBase {
  minPrice: number;
  minQty: number;
  maxVolume: number;
  minVolume: number;
  basePrecision: number;
  quotePrecision: number;
  price_tick_size: number;
  qty_step_size: number;
}

export type Asset = {
  id: string;
  ticker: string;
  name: string;
  decimal: number;
};

export type BookLevel = { price: number; qty: number };
export type Orderbook = {
  bids: BookLevel[];
  asks: BookLevel[];
};

export enum OrderTypeEnum {
  LIMIT = "LIMIT",
  MARKET = "MARKET",
}

export type OrderType = "LIMIT" | "MARKET";
export type OrderStatus = "OPEN" | "CLOSED" | "CANCELLED";
export type OrderSide = "Ask" | "Bid";
export interface Order {
  tradeAddress: string;
  orderId: string;
  price: number;
  averagePrice: number;
  type: OrderType;
  status: OrderStatus;
  isReverted: boolean;
  fee: number;
  timestamp: Date;
  market: MarketBase;
  side: OrderSide;
  filledQuantity: string;
  quantity: string;
}
export type MaybePaginated<T> = {
  data: T;
  nextToken: string | null | undefined;
};
export interface Trade {
  market: MarketBase;
  tradeId: string;
  price: number;
  qty: number;
  isReverted: boolean;
  fee: number;
  timestamp: Date;
  side: OrderSide;
  quote_qty: string;
}

export interface PublicTrade {
  price: number;
  qty: number;
  isReverted: boolean;
  timestamp: Date;
}

export type Ticker = {
  market: string;
  open: number;
  close: number;
  high: number;
  low: number;
  baseVolume: number;
  quoteVolume: number;
  currentPrice: number;
};
export type Balance = {
  asset: Asset;
  free: number;
  reserved: number;
};
export type AccountUpdates =
  | typeof USER_EVENTS.AddProxy
  | typeof USER_EVENTS.RemoveProxy
  | typeof USER_EVENTS.RegisterAccount;

export type AccountUpdateEvent = {
  main: string;
  proxy: string;
  type: AccountUpdates;
};
export type Kline = {
  open: number;
  high: number;
  low: number;
  close: number;
  baseVolume: number;
  quoteVolume: number;
  timestamp: Date;
};
export type TransactionType = "DEPOSIT" | "WITHDRAW";
export type TransactionStatus = "PENDING" | "CONFIRMED" | "FAILED" | "READY";
export type Transaction = {
  txType: TransactionType;
  amount: number;
  fee: number;
  timestamp: Date;
  status: TransactionStatus;
  asset: Asset;
  isReverted: boolean;
  stid: number;
  snapshot_id?: number;
};

export type PriceLevel = {
  price: number;
  qty: number;
  side: OrderSide;
  seqNum?: number;
};
export interface Subscription {
  unsubscribe: () => void;
}

export interface UserHistoryProps<T = null> {
  address: string;
  from: Date;
  to: Date;
  limit: number;
  pageParams: T;
  market?: string;
  batchLimit: number;
  basedOnFundingAccount?: boolean;
}
export interface UserAllHistoryProps {
  address: string;
  from: Date;
  to: Date;
}

export interface TransactionHistoryProps<T = null> {
  address: string;
  from: Date;
  to: Date;
  limit: number;
  pageParams: T;
  transaction_type: "DEPOSIT" | "WITHDRAW";
}

export interface OpenOrdersProps {
  address: string;
  basedOnFundingAccount?: boolean;
}
export interface MarketHistoryProps<T = null> {
  market: string;
  from: Date;
  to: Date;
  limit: number;
  pageParams: T;
}
export interface LatestTradesPropsForMarket {
  market: string;
  limit: number;
}
export interface KlineHistoryProps {
  market: string;
  from: Date;
  to: Date;
  interval: string;
}
