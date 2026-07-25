/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "../API";
type GeneratedQuery<InputType, OutputType> = string & {
  __generatedQueryInput: InputType;
  __generatedQueryOutput: OutputType;
};

export const getTime = /* GraphQL */ `query GetTime {
  getTime
}
` as GeneratedQuery<APITypes.GetTimeQueryVariables, APITypes.GetTimeQuery>;
export const getOrderbook =
  /* GraphQL */ `query GetOrderbook($market: String!, $limit: Int, $nextToken: String) {
  getOrderbook(market: $market, limit: $limit, nextToken: $nextToken) {
    items {
      p
      q
      s
      stid
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
    APITypes.GetOrderbookQueryVariables,
    APITypes.GetOrderbookQuery
  >;
// NB: from/to are declared String! (ISO 8601), not AWSDateTime! — the
// self-hosted Rust GraphQL server (orderbook/server, async-graphql) has no
// AWSDateTime scalar and rejects the whole query with 'Unknown type
// "AWSDateTime"'. Values were always ISO strings; only the declaration
// changes. If this app is ever pointed back at real AppSync, these two
// declarations must revert to AWSDateTime!.
export const getKlinesByMarketInterval =
  /* GraphQL */ `query GetKlinesByMarketInterval(
  $market: String!
  $interval: String!
  $from: String!
  $to: String!
) {
  getKlinesByMarketInterval(
    market: $market
    interval: $interval
    from: $from
    to: $to
  ) {
    items {
      o
      c
      h
      l
      vb
      vq
      t
      __typename
    }
    __typename
  }
}
` as GeneratedQuery<
    APITypes.GetKlinesByMarketIntervalQueryVariables,
    APITypes.GetKlinesByMarketIntervalQuery
  >;
export const getAllAssets =
  /* GraphQL */ `query GetAllAssets($limit: Int, $nextToken: String) {
  getAllAssets(limit: $limit, nextToken: $nextToken) {
    items {
      symbol
      name
      asset_id
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
    APITypes.GetAllAssetsQueryVariables,
    APITypes.GetAllAssetsQuery
  >;
export const listTradesByMarket = /* GraphQL */ `query ListTradesByMarket(
  $m: String!
  $from: String!
  $to: String!
  $limit: Int
  $nextToken: String
) {
  listTradesByMarket(
    m: $m
    from: $from
    to: $to
    limit: $limit
    nextToken: $nextToken
  ) {
    items {
      m
      p
      q
      t
      stid
      taker_id
      maker_id
      trade_id
      isReverted
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListTradesByMarketQueryVariables,
  APITypes.ListTradesByMarketQuery
>;
export const listRecentTrades =
  /* GraphQL */ `query ListRecentTrades($m: String!, $limit: Int, $nextToken: String) {
  listRecentTrades(m: $m, limit: $limit, nextToken: $nextToken) {
    items {
      m
      p
      q
      t
      stid
      taker_id
      maker_id
      trade_id
      isReverted
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
    APITypes.ListRecentTradesQueryVariables,
    APITypes.ListRecentTradesQuery
  >;
export const getMarketTickers = /* GraphQL */ `query GetMarketTickers(
  $market: String!
  $from: String!
  $to: String!
) {
  getMarketTickers(market: $market, from: $from, to: $to) {
    items {
      o
      c
      h
      l
      vb
      vq
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetMarketTickersQueryVariables,
  APITypes.GetMarketTickersQuery
>;
export const getAllMarkets = /* GraphQL */ `query GetAllMarkets {
  getAllMarkets {
    items {
      market
      max_volume
      min_volume
      price_tick_size
      qty_step_size
      base_asset_precision
      quote_asset_precision
      __typename
    }
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetAllMarketsQueryVariables,
  APITypes.GetAllMarketsQuery
>;
export const findUserByTradeAccount =
  /* GraphQL */ `query FindUserByTradeAccount($trade_account: String!) {
  findUserByTradeAccount(trade_account: $trade_account) {
    items {
      main
      proxy
      stid
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
    APITypes.FindUserByTradeAccountQueryVariables,
    APITypes.FindUserByTradeAccountQuery
  >;
export const findUserByMainAccount =
  /* GraphQL */ `query FindUserByMainAccount($main_account: String!) {
  findUserByMainAccount(main_account: $main_account) {
    items {
      main
      proxy
      stid
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
    APITypes.FindUserByMainAccountQueryVariables,
    APITypes.FindUserByMainAccountQuery
  >;
export const findBalanceByMainAccount =
  /* GraphQL */ `query FindBalanceByMainAccount($main_account: String!, $asset: String!) {
  findBalanceByMainAccount(main_account: $main_account, asset: $asset) {
    a
    f
    r
    __typename
  }
}
` as GeneratedQuery<
    APITypes.FindBalanceByMainAccountQueryVariables,
    APITypes.FindBalanceByMainAccountQuery
  >;
export const getAllBalancesByMainAccount =
  /* GraphQL */ `query GetAllBalancesByMainAccount($main_account: String!) {
  getAllBalancesByMainAccount(main_account: $main_account) {
    items {
      a
      f
      r
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
    APITypes.GetAllBalancesByMainAccountQueryVariables,
    APITypes.GetAllBalancesByMainAccountQuery
  >;
export const findOrderById =
  /* GraphQL */ `query FindOrderById($order_id: String!) {
  findOrderById(order_id: $order_id) {
    u
    cid
    id
    t
    m
    s
    ot
    st
    p
    q
    qoq
    afp
    fq
    fee
    stid
    isReverted
    __typename
  }
}
` as GeneratedQuery<
    APITypes.FindOrderByIdQueryVariables,
    APITypes.FindOrderByIdQuery
  >;
export const listOrderHistoryByMainAccount =
  /* GraphQL */ `query ListOrderHistoryByMainAccount(
  $main_account: String!
  $from: String!
  $to: String
  $limit: Int
  $nextToken: String
) {
  listOrderHistoryByMainAccount(
    main_account: $main_account
    from: $from
    to: $to
    limit: $limit
    nextToken: $nextToken
  ) {
    items {
      u
      cid
      id
      t
      m
      s
      ot
      st
      p
      q
      qoq
      afp
      fq
      fee
      stid
      isReverted
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
    APITypes.ListOrderHistoryByMainAccountQueryVariables,
    APITypes.ListOrderHistoryByMainAccountQuery
  >;
export const listOrderHistoryByTradeAccount =
  /* GraphQL */ `query ListOrderHistoryByTradeAccount(
  $trade_account: String!
  $from: String!
  $to: String
  $limit: Int
  $nextToken: String
) {
  listOrderHistoryByTradeAccount(
    trade_account: $trade_account
    from: $from
    to: $to
    limit: $limit
    nextToken: $nextToken
  ) {
    items {
      u
      cid
      id
      t
      m
      s
      ot
      st
      p
      q
      qoq
      afp
      fq
      fee
      stid
      isReverted
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
    APITypes.ListOrderHistoryByTradeAccountQueryVariables,
    APITypes.ListOrderHistoryByTradeAccountQuery
  >;
export const listOpenOrdersByMainAccount =
  /* GraphQL */ `query ListOpenOrdersByMainAccount(
  $main_account: String!
  $limit: Int
  $nextToken: String
) {
  listOpenOrdersByMainAccount(
    main_account: $main_account
    limit: $limit
    nextToken: $nextToken
  ) {
    items {
      u
      cid
      id
      t
      m
      s
      ot
      st
      p
      q
      qoq
      afp
      fq
      fee
      stid
      isReverted
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
    APITypes.ListOpenOrdersByMainAccountQueryVariables,
    APITypes.ListOpenOrdersByMainAccountQuery
  >;
export const listOpenOrdersByTradeAccount =
  /* GraphQL */ `query ListOpenOrdersByTradeAccount(
  $trade_account: String!
  $limit: Int
  $nextToken: String
) {
  listOpenOrdersByTradeAccount(
    trade_account: $trade_account
    limit: $limit
    nextToken: $nextToken
  ) {
    items {
      u
      cid
      id
      t
      m
      s
      ot
      st
      p
      q
      qoq
      afp
      fq
      fee
      stid
      isReverted
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
    APITypes.ListOpenOrdersByTradeAccountQueryVariables,
    APITypes.ListOpenOrdersByTradeAccountQuery
  >;
export const listTransactionsByMainAccount =
  /* GraphQL */ `query ListTransactionsByMainAccount(
  $main_account: String!
  $from: String!
  $to: String!
  $transaction_type: TransactionType!
  $limit: Int
  $nextToken: String
) {
  listTransactionsByMainAccount(
    main_account: $main_account
    from: $from
    to: $to
    transaction_type: $transaction_type
    limit: $limit
    nextToken: $nextToken
  ) {
    items {
      tt
      a
      q
      fee
      st
      t
      stid
      snapshot_id
      isReverted
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
    APITypes.ListTransactionsByMainAccountQueryVariables,
    APITypes.ListTransactionsByMainAccountQuery
  >;
export const listTradesByMainAccount =
  /* GraphQL */ `query ListTradesByMainAccount(
  $main_account: String!
  $from: String!
  $to: String
  $limit: Int
  $nextToken: String
) {
  listTradesByMainAccount(
    main_account: $main_account
    from: $from
    to: $to
    limit: $limit
    nextToken: $nextToken
  ) {
    items {
      m
      p
      q
      s
      t
      stid
      trade_id
      isReverted
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
    APITypes.ListTradesByMainAccountQueryVariables,
    APITypes.ListTradesByMainAccountQuery
  >;
export const listTradesByTradeAccount =
  /* GraphQL */ `query ListTradesByTradeAccount(
  $trade_account: String!
  $from: String!
  $to: String
  $limit: Int
  $nextToken: String
) {
  listTradesByTradeAccount(
    trade_account: $trade_account
    from: $from
    to: $to
    limit: $limit
    nextToken: $nextToken
  ) {
    items {
      m
      p
      q
      s
      t
      stid
      trade_id
      isReverted
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
    APITypes.ListTradesByTradeAccountQueryVariables,
    APITypes.ListTradesByTradeAccountQuery
  >;
