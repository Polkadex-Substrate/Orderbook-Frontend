/* tslint:disable */
/* eslint-disable */
//  This file was automatically generated and should not be edited.

export type UserActionInput = {
  payload: string;
};

export type Channel = {
  __typename: "Channel";
  name: string;
  data: string;
};

export type Orderbook = {
  __typename: "Orderbook";
  items?: Array<PriceLevel | null> | null;
  nextToken?: string | null;
};

export type PriceLevel = {
  __typename: "PriceLevel";
  p: string;
  q: string;
  s?: OrderSide | null;
  stid: string;
};

export enum OrderSide {
  Bid = "Bid",
  Ask = "Ask",
}

export type KlinesConnection = {
  __typename: "KlinesConnection";
  items?: Array<CandleStick | null> | null;
};

export type CandleStick = {
  __typename: "CandleStick";
  o: string;
  c: string;
  h: string;
  l: string;
  vb: string;
  vq: string;
  t: string;
};

export type AssetsConnection = {
  __typename: "AssetsConnection";
  items?: Array<Asset | null> | null;
  nextToken?: string | null;
};

export type Asset = {
  __typename: "Asset";
  symbol: string;
  name: string;
  asset_id: string;
};

export type TradesConnection = {
  __typename: "TradesConnection";
  items?: Array<Trade | null> | null;
  nextToken?: string | null;
};

export type Trade = {
  __typename: "Trade";
  m: string;
  p: string;
  q: string;
  t: string;
  stid: string;
  taker_id?: string | null;
  maker_id?: string | null;
  trade_id?: string | null;
  isReverted?: boolean | null;
};

export type TickersConnection = {
  __typename: "TickersConnection";
  items?: TickerStats | null;
  nextToken?: string | null;
};

export type TickerStats = {
  __typename: "TickerStats";
  o: string;
  c: string;
  h: string;
  l: string;
  vb: string;
  vq: string;
};

export type MarketsConnection = {
  __typename: "MarketsConnection";
  items?: Array<Market | null> | null;
};

export type Market = {
  __typename: "Market";
  market: string;
  max_volume: string;
  min_volume: string;
  price_tick_size: string;
  qty_step_size: string;
  base_asset_precision: string;
  quote_asset_precision: string;
};

export type AccountConnection = {
  __typename: "AccountConnection";
  items?: Array<Account | null> | null;
  nextToken?: string | null;
};

export type Account = {
  __typename: "Account";
  main?: string | null;
  proxy?: string | null;
  stid?: string | null;
};

export type Balance = {
  __typename: "Balance";
  a: string;
  f: string;
  r: string;
};

export type BalanceConnection = {
  __typename: "BalanceConnection";
  items?: Array<Balance | null> | null;
  nextToken?: string | null;
};

export type Order = {
  __typename: "Order";
  u: string;
  cid: string;
  id: string;
  t: string;
  m: string;
  s: string;
  ot: string;
  st: string;
  p: string;
  q: string;
  qoq: string;
  afp: string;
  fq: string;
  fee: string;
  stid: string;
  isReverted?: boolean | null;
};

export type OrdersConnection = {
  __typename: "OrdersConnection";
  items?: Array<Order | null> | null;
  nextToken?: string | null;
};

export enum TransactionType {
  DEPOSIT = "DEPOSIT",
  WITHDRAW = "WITHDRAW",
}

export type TransactionsConnection = {
  __typename: "TransactionsConnection";
  items?: Array<Transaction | null> | null;
  nextToken?: string | null;
};

export type Transaction = {
  __typename: "Transaction";
  tt: string;
  a: string;
  q: string;
  fee: string;
  st: string;
  t: string;
  stid: string;
  snapshot_id?: string | null;
  isReverted?: boolean | null;
};

export type UserTradesConnection = {
  __typename: "UserTradesConnection";
  items?: Array<UserTrade | null> | null;
  nextToken?: string | null;
};

export type UserTrade = {
  __typename: "UserTrade";
  m: string;
  p: string;
  q: string;
  s: string;
  t: string;
  stid: string;
  trade_id?: string | null;
  isReverted?: boolean | null;
};

export type Place_orderMutationVariables = {
  input: UserActionInput;
};

export type Place_orderMutation = {
  place_order?: string | null;
};

export type Cancel_orderMutationVariables = {
  input: UserActionInput;
};

export type Cancel_orderMutation = {
  cancel_order?: string | null;
};

export type Cancel_allMutationVariables = {
  input: UserActionInput;
};

export type Cancel_allMutation = {
  cancel_all?: string | null;
};

export type WithdrawMutationVariables = {
  input: UserActionInput;
};

export type WithdrawMutation = {
  withdraw?: string | null;
};

export type PublishMutationVariables = {
  name: string;
  data: string;
};

export type PublishMutation = {
  publish?: {
    __typename: "Channel";
    name: string;
    data: string;
  } | null;
};

export type GetTimeQueryVariables = {};

export type GetTimeQuery = {
  getTime: string;
};

export type GetOrderbookQueryVariables = {
  market: string;
  limit?: number | null;
  nextToken?: string | null;
};

export type GetOrderbookQuery = {
  getOrderbook?: {
    __typename: "Orderbook";
    items?: Array<{
      __typename: "PriceLevel";
      p: string;
      q: string;
      s?: OrderSide | null;
      stid: string;
    } | null> | null;
    nextToken?: string | null;
  } | null;
};

export type GetKlinesByMarketIntervalQueryVariables = {
  market: string;
  interval: string;
  from: string;
  to: string;
};

export type GetKlinesByMarketIntervalQuery = {
  getKlinesByMarketInterval?: {
    __typename: "KlinesConnection";
    items?: Array<{
      __typename: "CandleStick";
      o: string;
      c: string;
      h: string;
      l: string;
      vb: string;
      vq: string;
      t: string;
    } | null> | null;
  } | null;
};

export type GetAllAssetsQueryVariables = {
  limit?: number | null;
  nextToken?: string | null;
};

export type GetAllAssetsQuery = {
  getAllAssets?: {
    __typename: "AssetsConnection";
    items?: Array<{
      __typename: "Asset";
      symbol: string;
      name: string;
      asset_id: string;
    } | null> | null;
    nextToken?: string | null;
  } | null;
};

export type ListTradesByMarketQueryVariables = {
  m: string;
  from: string;
  to?: string | null;
  limit?: number | null;
  nextToken?: string | null;
};

export type ListTradesByMarketQuery = {
  listTradesByMarket?: {
    __typename: "TradesConnection";
    items?: Array<{
      __typename: "Trade";
      m: string;
      p: string;
      q: string;
      t: string;
      stid: string;
      taker_id?: string | null;
      maker_id?: string | null;
      trade_id?: string | null;
      isReverted?: boolean | null;
    } | null> | null;
    nextToken?: string | null;
  } | null;
};

export type ListRecentTradesQueryVariables = {
  m: string;
  limit?: number | null;
  nextToken?: string | null;
};

export type ListRecentTradesQuery = {
  listRecentTrades?: {
    __typename: "TradesConnection";
    items?: Array<{
      __typename: "Trade";
      m: string;
      p: string;
      q: string;
      t: string;
      stid: string;
      taker_id?: string | null;
      maker_id?: string | null;
      trade_id?: string | null;
      isReverted?: boolean | null;
    } | null> | null;
    nextToken?: string | null;
  } | null;
};

export type GetMarketTickersQueryVariables = {
  market: string;
  from: string;
  to: string;
};

export type GetMarketTickersQuery = {
  getMarketTickers?: {
    __typename: "TickersConnection";
    items?: {
      __typename: "TickerStats";
      o: string;
      c: string;
      h: string;
      l: string;
      vb: string;
      vq: string;
    } | null;
    nextToken?: string | null;
  } | null;
};

export type GetAllMarketsQueryVariables = {};

export type GetAllMarketsQuery = {
  getAllMarkets?: {
    __typename: "MarketsConnection";
    items?: Array<{
      __typename: "Market";
      market: string;
      max_volume: string;
      min_volume: string;
      price_tick_size: string;
      qty_step_size: string;
      base_asset_precision: string;
      quote_asset_precision: string;
    } | null> | null;
  } | null;
};

export type FindUserByTradeAccountQueryVariables = {
  trade_account: string;
};

export type FindUserByTradeAccountQuery = {
  findUserByTradeAccount?: {
    __typename: "AccountConnection";
    items?: Array<{
      __typename: "Account";
      main?: string | null;
      proxy?: string | null;
      stid?: string | null;
    } | null> | null;
    nextToken?: string | null;
  } | null;
};

export type FindUserByMainAccountQueryVariables = {
  main_account: string;
};

export type FindUserByMainAccountQuery = {
  findUserByMainAccount?: {
    __typename: "AccountConnection";
    items?: Array<{
      __typename: "Account";
      main?: string | null;
      proxy?: string | null;
      stid?: string | null;
    } | null> | null;
    nextToken?: string | null;
  } | null;
};

export type FindBalanceByMainAccountQueryVariables = {
  main_account: string;
  asset: string;
};

export type FindBalanceByMainAccountQuery = {
  findBalanceByMainAccount?: {
    __typename: "Balance";
    a: string;
    f: string;
    r: string;
  } | null;
};

export type GetAllBalancesByMainAccountQueryVariables = {
  main_account: string;
};

export type GetAllBalancesByMainAccountQuery = {
  getAllBalancesByMainAccount?: {
    __typename: "BalanceConnection";
    items?: Array<{
      __typename: "Balance";
      a: string;
      f: string;
      r: string;
    } | null> | null;
    nextToken?: string | null;
  } | null;
};

export type FindOrderByIdQueryVariables = {
  order_id: string;
};

export type FindOrderByIdQuery = {
  findOrderById?: {
    __typename: "Order";
    u: string;
    cid: string;
    id: string;
    t: string;
    m: string;
    s: string;
    ot: string;
    st: string;
    p: string;
    q: string;
    qoq: string;
    afp: string;
    fq: string;
    fee: string;
    stid: string;
    isReverted?: boolean | null;
  } | null;
};

export type ListOrderHistoryByMainAccountQueryVariables = {
  main_account: string;
  from: string;
  to?: string | null;
  limit?: number | null;
  nextToken?: string | null;
};

export type ListOrderHistoryByMainAccountQuery = {
  listOrderHistoryByMainAccount?: {
    __typename: "OrdersConnection";
    items?: Array<{
      __typename: "Order";
      u: string;
      cid: string;
      id: string;
      t: string;
      m: string;
      s: string;
      ot: string;
      st: string;
      p: string;
      q: string;
      qoq: string;
      afp: string;
      fq: string;
      fee: string;
      stid: string;
      isReverted?: boolean | null;
    } | null> | null;
    nextToken?: string | null;
  } | null;
};

export type ListOrderHistoryByTradeAccountQueryVariables = {
  trade_account: string;
  from: string;
  to?: string | null;
  limit?: number | null;
  nextToken?: string | null;
};

export type ListOrderHistoryByTradeAccountQuery = {
  listOrderHistoryByTradeAccount?: {
    __typename: "OrdersConnection";
    items?: Array<{
      __typename: "Order";
      u: string;
      cid: string;
      id: string;
      t: string;
      m: string;
      s: string;
      ot: string;
      st: string;
      p: string;
      q: string;
      qoq: string;
      afp: string;
      fq: string;
      fee: string;
      stid: string;
      isReverted?: boolean | null;
    } | null> | null;
    nextToken?: string | null;
  } | null;
};

export type ListOpenOrdersByMainAccountQueryVariables = {
  main_account: string;
  limit?: number | null;
  nextToken?: string | null;
};

export type ListOpenOrdersByMainAccountQuery = {
  listOpenOrdersByMainAccount?: {
    __typename: "OrdersConnection";
    items?: Array<{
      __typename: "Order";
      u: string;
      cid: string;
      id: string;
      t: string;
      m: string;
      s: string;
      ot: string;
      st: string;
      p: string;
      q: string;
      qoq: string;
      afp: string;
      fq: string;
      fee: string;
      stid: string;
      isReverted?: boolean | null;
    } | null> | null;
    nextToken?: string | null;
  } | null;
};

export type ListOpenOrdersByTradeAccountQueryVariables = {
  trade_account: string;
  limit?: number | null;
  nextToken?: string | null;
};

export type ListOpenOrdersByTradeAccountQuery = {
  listOpenOrdersByTradeAccount?: {
    __typename: "OrdersConnection";
    items?: Array<{
      __typename: "Order";
      u: string;
      cid: string;
      id: string;
      t: string;
      m: string;
      s: string;
      ot: string;
      st: string;
      p: string;
      q: string;
      qoq: string;
      afp: string;
      fq: string;
      fee: string;
      stid: string;
      isReverted?: boolean | null;
    } | null> | null;
    nextToken?: string | null;
  } | null;
};

export type ListTransactionsByMainAccountQueryVariables = {
  main_account: string;
  from: string;
  to?: string | null;
  transaction_type: TransactionType;
  limit?: number | null;
  nextToken?: string | null;
};

export type ListTransactionsByMainAccountQuery = {
  listTransactionsByMainAccount?: {
    __typename: "TransactionsConnection";
    items?: Array<{
      __typename: "Transaction";
      tt: string;
      a: string;
      q: string;
      fee: string;
      st: string;
      t: string;
      stid: string;
      snapshot_id?: string | null;
      isReverted?: boolean | null;
    } | null> | null;
    nextToken?: string | null;
  } | null;
};

export type ListTradesByMainAccountQueryVariables = {
  main_account: string;
  from: string;
  to?: string | null;
  limit?: number | null;
  nextToken?: string | null;
};

export type ListTradesByMainAccountQuery = {
  listTradesByMainAccount?: {
    __typename: "UserTradesConnection";
    items?: Array<{
      __typename: "UserTrade";
      m: string;
      p: string;
      q: string;
      s: string;
      t: string;
      stid: string;
      trade_id?: string | null;
      isReverted?: boolean | null;
    } | null> | null;
    nextToken?: string | null;
  } | null;
};

export type ListTradesByTradeAccountQueryVariables = {
  trade_account: string;
  from: string;
  to?: string | null;
  limit?: number | null;
  nextToken?: string | null;
};

export type ListTradesByTradeAccountQuery = {
  listTradesByTradeAccount?: {
    __typename: "UserTradesConnection";
    items?: Array<{
      __typename: "UserTrade";
      m: string;
      p: string;
      q: string;
      s: string;
      t: string;
      stid: string;
      trade_id?: string | null;
      isReverted?: boolean | null;
    } | null> | null;
    nextToken?: string | null;
  } | null;
};

export type Websocket_streamsSubscriptionVariables = {
  name: string;
};

export type Websocket_streamsSubscription = {
  websocket_streams?: {
    __typename: "Channel";
    name: string;
    data: string;
  } | null;
};
