/**
 * New GraphQL WebSocket Subscriptions
 *
 * Replaces AppSync MQTT subscriptions with standard GraphQL WebSocket protocol.
 * Maintains same interface as AppsyncV1Subscriptions for compatibility.
 */

import { READ_ONLY_TOKEN, USER_EVENTS } from "@orderbook/core/constants";
import { Observable } from "rxjs";
import { filter, map } from "rxjs/operators";
import gql from "graphql-tag";

import { getApolloClient } from "../../../helpers/graphql";
import * as SUBS from "../../../graphql/subscriptions";
import { parseTimestampOrEpoch } from "../../../helpers/parseTimestamp";
import { placeholderMarket } from "../../../helpers/placeholderMarket";

import { KlineIntervals } from "./constants";
import {
  AccountUpdateEvent,
  Asset,
  Balance,
  Kline,
  PriceLevel,
  PublicTrade,
  Subscription,
  Ticker,
  Trade,
  Transaction,
  Order,
  OrderType,
  OrderStatus,
  MarketBase,
  OrderSide,
} from "./../types";
import {
  OrderbookReadStrategy,
  OrderbookSubscriptionStrategy,
  SubscriptionCallBack,
} from "./../interfaces";
import { convertBookUpdatesToPriceLevels, toNullableNumber } from "./helpers";
import { parseOrderEvent } from "./orderEventPayload";
import {
  BalanceUpdateEvent,
  BookUpdateEvent,
  CandleStickUpdateEvent,
  TradeEvent,
  TransactionUpdateEvent,
  UserTradeEvent,
} from "./types";

/**
 * New GraphQL WebSocket-based subscriptions
 * Uses Apollo Client with graphql-ws protocol
 */
class GraphQLWebSocketSubscriptions implements OrderbookSubscriptionStrategy {
  _assetList: Asset[];
  _marketList: MarketBase[];
  _isReady = false;
  readApi: OrderbookReadStrategy;

  constructor(readApi: OrderbookReadStrategy) {
    this.readApi = readApi;
  }

  async init() {
    await this.readApi.init();
    this._assetList = await this.readApi.getAssets();
    this._marketList = await this.readApi.getMarkets();
    this._isReady = true;
  }

  isReady() {
    return this._isReady;
  }

  /**
   * Helper to create Apollo subscription observable
   */
  private createSubscription<T>(
    query: string,
    variables: Record<string, any>,
    token?: string
  ): Observable<T> {
    const client = getApolloClient(token || READ_ONLY_TOKEN);

    return new Observable<T>((observer) => {
      const subscription = client
        .subscribe({
          query: gql(query),
          variables,
        })
        .subscribe({
          next: (result: any) => {
            if (result.data) {
              observer.next(result as T);
            }
          },
          error: (error: any) => {
            console.error("[GraphQL WS] Subscription error:", error);
            observer.error(error);
          },
          complete: () => {
            observer.complete();
          },
        });

      // Return cleanup function
      return () => {
        subscription.unsubscribe();
      };
    });
  }

  /**
   * Helper to filter user subscription events by type
   */
  private filterUserEventType(data: any, eventType: string): boolean {
    try {
      const parsedData = JSON.parse(data?.websocket_streams?.data || "{}");
      return parsedData.type === eventType;
    } catch {
      return false;
    }
  }

  subscribeBalances(
    address: string,
    cb: SubscriptionCallBack<Balance>
  ): Subscription {
    if (!this._isReady) {
      throw new Error(`${this.constructor.name}: Not Initialized`);
    }

    const observable = this.createSubscription(SUBS.websocket_streams, {
      name: address,
    }).pipe(
      filter((data: any) =>
        this.filterUserEventType(data.data, USER_EVENTS.SetBalance)
      ),
      map((data: any) => {
        const eventData = JSON.parse(
          data.data.websocket_streams.data
        ) as BalanceUpdateEvent;
        const asset = this._assetList.find(
          (item) => item.id === eventData.asset.asset
        );
        if (!asset) {
          throw new Error(`Asset ${eventData.asset.asset} not found`);
        }
        return {
          asset,
          free: Number(eventData.free),
          reserved: Number(eventData.reserved),
        };
      })
    );

    return observable.subscribe(cb);
  }

  subscribeOrderbook(
    market: string,
    cb: SubscriptionCallBack<PriceLevel[]>
  ): Subscription {
    if (!this._isReady) {
      throw new Error(`${this.constructor.name}: Not Initialized`);
    }

    const observable = this.createSubscription(SUBS.websocket_streams, {
      name: `${market}-ob-inc`,
    }).pipe(
      map((data: any) => {
        const eventData = JSON.parse(
          data.data.websocket_streams.data
        ) as BookUpdateEvent;
        return convertBookUpdatesToPriceLevels(eventData);
      })
    );

    return observable.subscribe(cb);
  }

  subscribeUserTrades(
    market: string,
    cb: SubscriptionCallBack<Trade>
  ): Subscription {
    if (!this._isReady) {
      throw new Error(`${this.constructor.name}: Not Initialized`);
    }

    const observable = this.createSubscription(SUBS.websocket_streams, {
      name: market,
    }).pipe(
      filter((data: any) =>
        this.filterUserEventType(data.data, USER_EVENTS.TradeFormat)
      ),
      map((data: any): Trade => {
        const eventData = JSON.parse(
          data.data.websocket_streams.data
        ) as UserTradeEvent;
        const market = this._marketList.find((x) => x.id === eventData?.m);
        if (!market) {
          throw new Error(
            `[${this.constructor.name}:subscribeUserTrades] cannot find market`
          );
        }
        return {
          market,
          tradeId: eventData.trade_id.toString(),
          price: Number(eventData.p),
          quote_qty: eventData.vq,
          qty: Number(eventData.q),
          isReverted: false,
          fee: 0,
          timestamp: parseTimestampOrEpoch(eventData.t),
          side: eventData.s,
        };
      })
    );

    return observable.subscribe(cb);
  }

  subscribeKLines(
    market: string,
    interval: string,
    onUpdate: SubscriptionCallBack<Kline>
  ): Subscription {
    if (!this._isReady) {
      throw new Error(`${this.constructor.name}: Not Initialized`);
    }

    if (!KlineIntervals.find((item) => item === interval)) {
      throw new Error(`${this.constructor.name}: Invalid interval`);
    }

    const observable = this.createSubscription(SUBS.websocket_streams, {
      name: `${market}_${interval}`,
    }).pipe(
      filter((data: any) => Boolean(data?.data?.websocket_streams?.data)),
      map((data: any): Kline => {
        const item = JSON.parse(
          data.data.websocket_streams.data
        ) as CandleStickUpdateEvent;
        return {
          open: Number(item.o),
          high: Number(item.h),
          low: Number(item.l),
          close: Number(item.c),
          baseVolume: Number(item.vb),
          quoteVolume: Number(item.vq),
          timestamp: parseTimestampOrEpoch(item.t),
        };
      })
    );

    return observable.subscribe(onUpdate);
  }

  subscribeLatestTrades(
    market: string,
    onUpdate: SubscriptionCallBack<PublicTrade>
  ): Subscription {
    const observable = this.createSubscription(SUBS.websocket_streams, {
      name: `${market}-recent-trades`,
    }).pipe(
      filter((data: any) => Boolean(data?.data?.websocket_streams?.data)),
      map((data: any): PublicTrade => {
        const item = JSON.parse(data.data.websocket_streams.data) as TradeEvent;
        return {
          price: Number(item.p),
          qty: Number(item.q),
          isReverted: false,
          timestamp: parseTimestampOrEpoch(item.t),
        };
      })
    );

    return observable.subscribe(onUpdate);
  }

  subscribeOrders(
    address: string,
    onUpdate: SubscriptionCallBack<Order>
  ): Subscription {
    if (!this._isReady) {
      throw new Error(`${this.constructor.name}: Not Initialized`);
    }

    const observable = this.createSubscription(SUBS.websocket_streams, {
      name: address,
    }).pipe(
      filter((data: any) =>
        this.filterUserEventType(data.data, USER_EVENTS.Order)
      ),
      map((data: any): Order | null => {
        /*
         * PARSED BY SHAPE, NOT BY ASSUMPTION. This mapper used to read the
         * LONG field names (item.status, item.filled_quantity, item.side)
         * from a payload the engine serialises with ABBREVIATED ones (st, fq,
         * s - see OrderEvent in Orderbook-Backend appsync_client.rs). Every
         * field that matters came back undefined.
         *
         * Nobody noticed, because the failure's visible half worked: an
         * undefined status is not "OPEN", so the provider's else-branch
         * REMOVED filled orders from Open Orders - the right outcome by
         * accident. Meanwhile orderUpdateNotice matched no branch on
         * undefined, so no fill toast, no notification and no sound ever
         * fired. Reported three times as "order completion message is not
         * coming", and it survived two earlier fixes because the notice logic
         * and its delivery were both genuinely broken too - just not the root.
         *
         * parseOrderEvent accepts both serialisations, because the engine has
         * already switched once and a parser pinned to the new shape does to
         * a rollback what the old code did to the upgrade.
         */
        const item = parseOrderEvent(
          JSON.parse(data.data.websocket_streams.data)
        );
        if (!item) {
          console.warn(
            "[subscribeOrders] dropped an Order event in an unknown shape"
          );
          return null;
        }
        const market = this._marketList.find((m) => m.id === item.marketId);
        return {
          tradeAddress: item.user,
          // `{} as MarketBase` was a LIE to the compiler: that object has no
          // baseAsset/quoteAsset, so all 22 `market.baseAsset.ticker` reads in the
          // Orders panel threw (ORDERBOOK-TESTNET-6). A structurally complete
          // placeholder is safe to read at any depth and shows a dash rather than
          // inventing a pair. See helpers/placeholderMarket.ts.
          market: market || (placeholderMarket(item.marketId) as MarketBase),
          orderId: item.orderId,
          price: item.price,
          averagePrice: item.averagePrice,
          type: item.type,
          status: item.status,
          isReverted: false,
          fee: item.fee,
          timestamp: parseTimestampOrEpoch(item.timestamp),
          side: item.side,
          filledQuantity: item.filledQuantity,
          quantity: item.quantity,
        };
      }),
      filter((order): order is Order => order !== null)
    );

    return observable.subscribe(onUpdate);
  }

  subscribeTicker(
    market: string,
    onUpdate: SubscriptionCallBack<Ticker>
  ): Subscription {
    if (!this._isReady) {
      throw new Error(`${this.constructor.name}: Not Initialized`);
    }

    const observable = this.createSubscription(SUBS.websocket_streams, {
      name: `${market}-ticker`,
    }).pipe(
      filter((data: any) => Boolean(data?.data?.websocket_streams?.data)),
      map((data: any): Ticker => {
        const item = JSON.parse(
          data.data.websocket_streams.data
        ) as CandleStickUpdateEvent;
        return {
          market,
          open: toNullableNumber(item.o),
          close: toNullableNumber(item.c),
          high: toNullableNumber(item.h),
          low: toNullableNumber(item.l),
          baseVolume: toNullableNumber(item.vb),
          quoteVolume: toNullableNumber(item.vq),
          currentPrice: toNullableNumber(item.c),
        };
      })
    );

    return observable.subscribe(onUpdate);
  }

  subscribeTransactions(
    address: string,
    onUpdate: SubscriptionCallBack<Transaction>
  ): Subscription {
    if (!this._isReady) {
      throw new Error(`${this.constructor.name}: Not Initialized`);
    }

    const observable = this.createSubscription(SUBS.websocket_streams, {
      name: address,
    }).pipe(
      filter((data: any) =>
        this.filterUserEventType(data.data, USER_EVENTS.SetTransaction)
      ),
      map((data: any): Transaction => {
        const item = JSON.parse(
          data.data.websocket_streams.data
        ) as TransactionUpdateEvent;

        const itemAssetId =
          typeof item?.asset === "string" ? item?.asset : item?.asset?.asset;

        const asset = this._assetList.find((a) => a.id === itemAssetId);
        if (!asset) {
          throw new Error(`Asset ${itemAssetId} not found`);
        }
        return {
          stid: Number(item.stid),
          snapshot_id: Number(item.snapshot_id),
          amount: item.amount,
          fee: 0,
          isReverted: false,
          status: item.status,
          timestamp: new Date(),
          txType: item.txn_type === "DEPOSIT" ? "DEPOSIT" : "WITHDRAW",
          asset,
        };
      })
    );

    return observable.subscribe(onUpdate);
  }

  subscribeAccountUpdate(
    address: string,
    onUpdate: SubscriptionCallBack<AccountUpdateEvent>
  ): Subscription {
    if (!this._isReady) {
      throw new Error(`${this.constructor.name}: Not Initialized`);
    }

    const observable = this.createSubscription(SUBS.websocket_streams, {
      name: address,
    }).pipe(
      filter((data: any) => Boolean(data?.data?.websocket_streams?.data)),
      filter((data: any) => {
        const item = JSON.parse(
          data.data.websocket_streams.data
        ) as AccountUpdateEvent;
        return (
          item.type === USER_EVENTS.AddProxy ||
          item.type === USER_EVENTS.RemoveProxy ||
          item.type === USER_EVENTS.RegisterAccount
        );
      }),
      map((data: any): AccountUpdateEvent => {
        const item = JSON.parse(
          data.data.websocket_streams.data
        ) as AccountUpdateEvent;
        return {
          main: item.main,
          proxy: item.proxy,
          type: item.type,
        };
      })
    );

    return observable.subscribe(onUpdate);
  }
}

export { GraphQLWebSocketSubscriptions };
