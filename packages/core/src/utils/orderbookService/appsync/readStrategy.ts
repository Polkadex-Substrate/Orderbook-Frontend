import { GraphQLResult } from "@aws-amplify/api";
import { unknownAsset } from "@orderbook/core/utils/orderbookService/appsync/constants";
import {
  DEFAULT_BATCH_LIMIT,
  RECENT_TRADES_LIMIT,
} from "@orderbook/core/constants";

import {
  FindUserByMainAccountQuery,
  FindUserByTradeAccountQuery,
  GetAllAssetsQuery,
  GetAllBalancesByMainAccountQuery,
  GetAllMarketsQuery,
  GetKlinesByMarketIntervalQuery,
  GetMarketTickersQuery,
  Order as APIOrder,
  Trade as APITrade,
  Transaction as APITransaction,
  PriceLevel,
  UserTrade,
} from "../../../API";
import * as QUERIES from "../../../graphql/queries";

import { OrderbookReadStrategy } from "./../interfaces";
import {
  Asset,
  Kline,
  UserHistoryProps,
  Balance,
  Market,
  Order,
  Orderbook,
  Ticker,
  Trade,
  PublicTrade,
  Transaction,
  KlineHistoryProps,
  OrderStatus,
  OrderType,
  BookLevel,
  MaybePaginated,
  LatestTradesPropsForMarket,
  OrderSide,
  TransactionHistoryProps,
  UserAllHistoryProps,
  OpenOrdersProps,
} from "./../types";
import {
  fetchBatchFromAppSync,
  fetchFullListFromAppSync,
  sendQueryToAppSync,
  toNullableNumber,
} from "./helpers";

class AppsyncV1Reader implements OrderbookReadStrategy {
  ready = false;
  _assetsList: Asset[] = [];
  _marketList: Market[] = [];
  public isReady(): boolean {
    return this.ready;
  }

  public async init(): Promise<void> {
    this._assetsList = await this.getAssets();
    this._marketList = await this.getMarkets();
    this.ready = true;
  }

  public async getAssets(): Promise<Asset[]> {
    if (this.isReady()) {
      return this._assetsList;
    }
    const allAssets = await sendQueryToAppSync<
      GraphQLResult<GetAllAssetsQuery>
    >({
      query: QUERIES.getAllAssets,
    });
    const assets = allAssets?.data?.getAllAssets?.items?.map((item): Asset => {
      return {
        ticker: item?.symbol || "",
        name: item?.name || "",
        decimal: 8,
        id: item?.asset_id || "",
      };
    });
    return assets || [];
  }

  public async getBalance(fundingAddress: string): Promise<Balance[]> {
    // make sure assets are already fetched
    if (!this.isReady()) {
      await this.init();
    }
    const balancesQueryResult = await sendQueryToAppSync<
      GraphQLResult<GetAllBalancesByMainAccountQuery>
    >({
      query: QUERIES.getAllBalancesByMainAccount,
      variables: {
        main_account: fundingAddress,
      },
    });
    const balances =
      balancesQueryResult?.data?.getAllBalancesByMainAccount?.items?.map(
        (item): Balance => {
          const asset =
            this._assetsList.find((x) => x.id === item?.a) || unknownAsset;
          if (!asset) {
            throw new Error(
              `[${this.constructor.name}:getBalance] cannot find asset: ${item?.a}`
            );
          }
          return {
            asset,
            free: Number(item?.f) || 0,
            reserved: Number(item?.r) || 0,
          };
        }
      );
    return balances || [];
  }

  async getCandles(args: KlineHistoryProps): Promise<Kline[]> {
    const candlesQueryResult = await sendQueryToAppSync<
      GraphQLResult<GetKlinesByMarketIntervalQuery>
    >({
      query: QUERIES.getKlinesByMarketInterval,
      variables: {
        from: args.from.toISOString(),
        to: args.to.toISOString(),
        market: args.market,
        interval: args.interval,
      },
    });
    const candles =
      candlesQueryResult?.data?.getKlinesByMarketInterval?.items?.map(
        (item): Kline => {
          return {
            high: Number(item?.h) || 0,
            low: Number(item?.l) || 0,
            open: Number(item?.o) || 0,
            close: Number(item?.c) || 0,
            baseVolume: Number(item?.vb) || 0,
            quoteVolume: Number(item?.vq) || 0,
            timestamp: new Date(item?.t || 0),
          };
        }
      );
    return candles || [];
  }

  async getMarkets(): Promise<Market[]> {
    if (this.isReady()) {
      return this._marketList;
    }
    const assetList = await this.getAssets();
    const marketsQueryResult = await sendQueryToAppSync<
      GraphQLResult<GetAllMarketsQuery>
    >({
      query: QUERIES.getAllMarkets,
    });
    const markets: Market[] = [];
    marketsQueryResult?.data?.getAllMarkets?.items?.forEach((item) => {
      const market = item?.market || "";
      const [baseAssetId, quoteAssetId] = market.split("-");
      const baseAsset = assetList.find((x) => x.id === baseAssetId);
      if (!baseAsset) {
        console.error(
          `[${this.constructor.name}:getMarkets] cannot find base asset ${baseAssetId}`
        );
      }
      const quoteAsset = assetList.find((x) => x.id === quoteAssetId);
      if (!quoteAsset) {
        console.error(
          `[${this.constructor.name}:getMarkets] cannot find quote asset ${quoteAssetId}`
        );
        return;
      }
      if (!quoteAsset || !baseAsset) return;
      markets.push({
        id: market || "",
        name: `${baseAsset.ticker}/${quoteAsset.ticker}`,
        baseAsset,
        quoteAsset,
        minPrice: Number(item?.price_tick_size) || 0,
        minQty: Number(item?.qty_step_size) || 0,
        basePrecision: Number(item?.base_asset_precision) || 0,
        quotePrecision: Number(item?.quote_asset_precision) || 0,
        maxVolume: Number(item?.max_volume),
        minVolume: Number(item?.min_volume),
        price_tick_size: Number(item?.price_tick_size),
        qty_step_size: Number(item?.qty_step_size),
      });
    });
    return markets || [];
  }

  async getOpenOrders(args: OpenOrdersProps): Promise<Order[]> {
    if (!this.isReady()) {
      await this.init();
    }

    const queryKey = args.basedOnFundingAccount
      ? "listOpenOrdersByMainAccount"
      : "listOpenOrdersByTradeAccount";

    const variables = {
      [args.basedOnFundingAccount ? "main_account" : "trade_account"]:
        args.address,
    };

    const openOrderQueryResult = await fetchFullListFromAppSync<APIOrder>(
      QUERIES[queryKey],
      variables,
      queryKey
    );

    const openOrders = openOrderQueryResult?.map((item): Order => {
      return this.mapApiOrderToOrder(item, this._marketList);
    });
    return openOrders || [];
  }

  async getOrderHistory(
    args: UserHistoryProps
  ): Promise<MaybePaginated<Order[]>> {
    if (!this.isReady()) {
      await this.init();
    }

    const queryKey = args.basedOnFundingAccount
      ? "listOrderHistoryByMainAccount"
      : "listOrderHistoryByTradeAccount";

    const variables = {
      [args.basedOnFundingAccount ? "main_account" : "trade_account"]:
        args.address,
      limit: args.limit,
      from: args.from.toString(),
      to: args.to.toString(),
      nextToken: args.pageParams,
    };

    const orderHistoryQueryResult = await fetchBatchFromAppSync<APIOrder>(
      QUERIES[queryKey],
      variables,
      queryKey,
      args.batchLimit
    );

    if (!orderHistoryQueryResult) {
      return { data: [], nextToken: null };
    }

    const orderHistory = orderHistoryQueryResult?.response?.map(
      (item): Order => {
        return this.mapApiOrderToOrder(item, this._marketList);
      }
    );
    return {
      data: orderHistory || [],
      nextToken: orderHistoryQueryResult?.nextToken,
    };
  }

  async getOrderbook(market: string): Promise<Orderbook> {
    const queryResult = await fetchFullListFromAppSync<PriceLevel | null>(
      QUERIES.getOrderbook,
      {
        market,
      },
      "getOrderbook"
    );
    const bids: BookLevel[] = [];
    const asks: BookLevel[] = [];
    if (queryResult) {
      queryResult.forEach((item) => {
        if (item) {
          const level: BookLevel = {
            price: Number(item.p),
            qty: Number(item.q),
          };
          if (item.s === "Bid") {
            bids.push(level);
          } else {
            asks.push(level);
          }
        }
      });
    }
    return {
      bids: bids || [],
      asks: asks || [],
    };
  }

  async getTicker(market: string): Promise<Ticker> {
    // get tickers for the last 24 hours
    const to = new Date();
    // subtract 1 day
    const from = new Date(new Date().setDate(new Date().getDate() - 1));
    const tickersQueryResult = await sendQueryToAppSync<
      GraphQLResult<GetMarketTickersQuery>
    >({
      query: QUERIES.getMarketTickers,
      variables: { market, from: from.toISOString(), to: to.toISOString() },
    });
    const tickerItem = tickersQueryResult?.data?.getMarketTickers?.items;
    return {
      market,
      open: toNullableNumber(tickerItem?.o),
      close: toNullableNumber(tickerItem?.c),
      high: toNullableNumber(tickerItem?.h),
      low: toNullableNumber(tickerItem?.l),
      baseVolume: toNullableNumber(tickerItem?.vb),
      quoteVolume: toNullableNumber(tickerItem?.vq),
      currentPrice: toNullableNumber(tickerItem?.c),
    };
  }

  async getTradeHistory(
    args: UserHistoryProps
  ): Promise<MaybePaginated<Trade[]>> {
    if (!this.isReady()) {
      await this.init();
    }

    const queryKey = args.basedOnFundingAccount
      ? "listTradesByMainAccount"
      : "listTradesByTradeAccount";

    const variables = {
      [args.basedOnFundingAccount ? "main_account" : "trade_account"]:
        args.address,
      limit: args.limit,
      from: args.from.toString(),
      to: args.to.toString(),
      nextToken: args.pageParams,
    };

    const queryResult = await fetchBatchFromAppSync<UserTrade>(
      QUERIES[queryKey],
      variables,
      queryKey,
      args.batchLimit
    );
    if (!queryResult) {
      return { data: [], nextToken: null };
    }
    const trades = queryResult.response.map((item: UserTrade): Trade => {
      const market = this._marketList.find((x) => x.id === item?.m);
      if (!market) {
        throw new Error(
          `[${this.constructor.name}:getTradeHistory] cannot find market`
        );
      }
      return {
        market,
        price: Number(item.p) || 0,
        qty: Number(item.q) || 0,
        isReverted: item?.isReverted || false,
        timestamp: new Date(Number(item?.t) || 0),
        tradeId: item?.trade_id || "",
        fee: 0,
        side: item.s as OrderSide,
        quote_qty: String(Number(item.p) * Number(item.q)),
      };
    });
    return { data: trades, nextToken: queryResult.nextToken };
  }

  async getLatestTradesForMarket(
    args: LatestTradesPropsForMarket
  ): Promise<PublicTrade[]> {
    const queryResult = await fetchBatchFromAppSync<APITrade>(
      QUERIES.listRecentTrades,
      {
        m: args.market,
        limit: args.limit,
      },
      "listRecentTrades",
      RECENT_TRADES_LIMIT
    );
    if (!queryResult) {
      return [];
    }
    return queryResult.response.map((item: APITrade): PublicTrade => {
      return {
        price: Number(item?.p) || 0,
        qty: Number(item?.q) || 0,
        isReverted: item?.isReverted || false,
        timestamp: new Date(Number(item?.t) || 0),
      };
    });
  }

  async getTradingAddresses(fundingAddress: string): Promise<string[]> {
    const queryResult = await sendQueryToAppSync<
      GraphQLResult<FindUserByMainAccountQuery>
    >({
      query: QUERIES.findUserByMainAccount,
      variables: {
        main_account: fundingAddress,
      },
    });
    const res = queryResult?.data?.findUserByMainAccount?.items || [];
    return res.map((item) => item?.proxy || "");
  }

  async getTransactions(
    args: TransactionHistoryProps
  ): Promise<MaybePaginated<Transaction[]>> {
    if (!this.isReady()) {
      await this.init();
    }
    const queryResult = await fetchBatchFromAppSync<APITransaction>(
      QUERIES.listTransactionsByMainAccount,
      {
        main_account: args.address,
        limit: args.limit,
        from: args.from.toString(),
        to: args.to.toString(),
        transaction_type: args.transaction_type,
      },
      "listTransactionsByMainAccount",
      DEFAULT_BATCH_LIMIT
    );
    if (!queryResult) {
      return { data: [], nextToken: null };
    }
    const transactions = queryResult.response.map(
      (item: APITransaction): Transaction => {
        const asset = this._assetsList.find((x) => x.id === item?.a);
        if (!asset) {
          throw new Error(
            `[${this.constructor.name}:getTransactions] cannot find asset`
          );
        }
        return {
          stid: Number(item.stid),
          snapshot_id: Number(item.snapshot_id),
          txType: (item?.tt as Transaction["txType"]) || "",
          amount: Number(item?.q) || 0,
          fee: Number(item?.fee) || 0,
          timestamp: new Date(Number(item?.t) || 0),
          isReverted: item?.isReverted || false,
          status: (item?.st as Transaction["status"]) || "",
          asset,
        };
      }
    );
    return { data: transactions, nextToken: queryResult.nextToken };
  }

  async getFundingAddress(
    tradeAddress: string
  ): Promise<string | null | undefined> {
    const queryResult = await sendQueryToAppSync<
      GraphQLResult<FindUserByTradeAccountQuery>
    >({
      query: QUERIES.findUserByTradeAccount,
      variables: {
        trade_account: tradeAddress,
      },
    });
    return queryResult?.data?.findUserByTradeAccount?.items?.[0]?.main;
  }

  // For export purpose only
  async getAllOrderHistory(args: UserAllHistoryProps): Promise<Order[]> {
    if (!this.isReady()) {
      await this.init();
    }
    const orderHistoryQueryResult = await fetchFullListFromAppSync<APIOrder>(
      QUERIES.listOrderHistoryByMainAccount,
      {
        main_account: args.address,
        from: args.from.toString(),
        to: args.to.toString(),
      },
      "listOrderHistoryByMainAccount"
    );
    if (!orderHistoryQueryResult) {
      return [];
    }
    const orderHistory = orderHistoryQueryResult
      ?.filter((item) => this._marketList.find((x) => x.id === item?.m))
      ?.map((item): Order => {
        return this.mapApiOrderToOrder(item, this._marketList);
      });
    return orderHistory || [];
  }

  // For export purpose only
  async getAllTradeHistory(args: UserAllHistoryProps): Promise<Trade[]> {
    if (!this.isReady()) {
      await this.init();
    }
    const queryResult = await fetchFullListFromAppSync<UserTrade>(
      QUERIES.listTradesByMainAccount,
      {
        main_account: args.address,
        from: args.from.toString(),
        to: args.to.toString(),
      },
      "listTradesByMainAccount"
    );
    if (!queryResult) {
      return [];
    }
    const trades = queryResult
      ?.filter((item) => this._marketList.find((x) => x.id === item?.m))
      ?.map((item: UserTrade): Trade => {
        const market = this._marketList.find((x) => x.id === item?.m);
        if (!market) {
          throw new Error(
            `[${this.constructor.name}:getTradeHistory] cannot find market`
          );
        }
        return {
          market,
          price: Number(item.p) || 0,
          qty: Number(item.q) || 0,
          isReverted: item?.isReverted || false,
          timestamp: new Date(Number(item?.t) || 0),
          tradeId: item?.trade_id || "",
          fee: 0,
          side: item.s as OrderSide,
          quote_qty: String(Number(item.p) * Number(item.q)),
        };
      });
    return trades || [];
  }

  private mapApiOrderToOrder(item: APIOrder, marketList: Market[]): Order {
    const market = marketList.find((x) => x.id === item?.m);
    if (!market) {
      throw new Error(
        `[${this.constructor.name}:getOpenOrders] cannot find market`
      );
    }
    const marketBuyHistory =
      item.st !== "OPEN" && item.ot === "MARKET" && item.s === "Bid";
    return {
      market,
      tradeAddress: item?.u || "",
      orderId: item?.id || "",
      price: Number(item?.p) || 0,
      averagePrice: Number(item?.afp) || 0,
      type: (item?.ot as OrderType) || "LIMIT",
      status: (item?.st as OrderStatus) || "CLOSED",
      isReverted: item?.isReverted || false,
      fee: Number(item?.fee) || 0,
      timestamp: new Date(Number(item?.t) || 0),
      side: item.s as OrderSide,
      filledQuantity: String(item.fq),
      quantity: marketBuyHistory ? item.qoq : item.q,
    };
  }
}

export const appsyncReader = new AppsyncV1Reader();
