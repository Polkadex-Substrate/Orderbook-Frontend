import { KeyringPair } from "@polkadot/keyring/types";
import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { Signer } from "@polkadot/types/types";

export interface CommonActionState {
  isLoading: boolean;
  message?: string[];
  isError: boolean;
  isSuccess: boolean;
}

export type OrderSide = "Sell" | "Buy";
export type OrderType = "LIMIT" | "MARKET";
export type OrderStatus =
  "OPEN" | "CLOSED" | "Expired" | "CANCELLED" | "Failed";
export type TradeAccount = KeyringPair;

export interface ExtensionAccount {
  account: InjectedAccountWithMeta;
  signer: Signer;
}

export enum OrderTypeEnum {
  LIMIT = "LIMIT",
  MARKET = "MARKET",
}

export enum OrderSideEnum {
  Sell = "Sell",
  Buy = "Buy",
}

export enum OrderKindEnum {
  Bid = "Bid",
  Ask = "Ask",
}

export interface OrderCommon {
  main_account: string;
  id: string;
  client_order_id: string;
  time: string;
  m: string; // marketid
  side: string;
  order_type: string;
  status: string;
  price: number;
  qty: number;
  avg_filled_price: string;
  filled_quantity: string;
  fee: string;
  isReverted?: boolean | null;
}

export type CommonState = {
  error?: Error;
  loading?: boolean;
};

export type Ifilters = {
  hiddenPairs?: boolean;
  onlyBuy: boolean;
  onlySell: boolean;
  showReverted: boolean;
  status: "All Orders" | "Pending" | "Completed" | "Cancelled";
};
