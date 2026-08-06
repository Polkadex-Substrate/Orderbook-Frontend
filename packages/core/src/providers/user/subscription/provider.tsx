"use client";

import _ from "lodash";
import { useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  PublicTrade,
  appsyncOrderbookService,
  Order,
  MaybePaginated,
  PriceLevel,
  Trade,
  Transaction,
  Ticker,
  Balance,
  Kline,
  AccountUpdateEvent,
} from "@orderbook/core/utils/orderbookService";
import { InfiniteData, useQueryClient } from "@tanstack/react-query";
import {
  DEFAULT_BATCH_LIMIT,
  QUERY_KEYS,
  NOTIFICATIONS,
} from "@orderbook/core/constants";
import { useOrderbookService } from "@orderbook/core/providers/public/orderbookServiceProvider/useOrderbookService";
import {
  decimalPlaces,
  deleteFromBook,
  fetchOnChainBalance,
  getAbsoluteResolution,
  getCorrectTimestamp,
  getCurrentMarket,
  getResolutionInMilliSeconds,
  replaceOrAddToBook,
} from "@orderbook/core/helpers";
import {
  removeOrderFromList,
  replaceOrPushOrder,
} from "@orderbook/core/utils/orderbookService/appsync/helpers";
import { useOrderbook } from "@orderbook/core/hooks";
import { useExtensionAccounts } from "@polkadex/react-providers";

import { UserAddressTuple, useProfile } from "../profile";
import { useSettingsProvider } from "../../public/settings";
import { useSessionProvider } from "../sessionProvider";
import { useNativeApi } from "../../public/nativeApi";

import { Provider } from "./context";
import * as T from "./types";

export const SubscriptionProvider: T.SubscriptionComponent = ({
  children,
  marketId,
}) => {
  const queryClient = useQueryClient();
  const path = usePathname();
  const { onHandleError, onHandleInfo, onPushNotification } =
    useSettingsProvider();
  const { isReady, markets } = useOrderbookService();
  const { dateFrom, dateTo } = useSessionProvider();
  const {
    selectedAddresses: { tradeAddress, mainAddress },
    onUserSelectTradingAddress,
  } = useProfile();
  const { api } = useNativeApi();
  const { extensionAccounts } = useExtensionAccounts();

  const isTradingPage = path.startsWith("/trading");
  const marketName = isTradingPage ? marketId : null;
  const market = getCurrentMarket(markets, marketName)?.id;

  const { asks, bids } = useOrderbook(market as string);

  const onOrderUpdates = useCallback(
    (payload: Order, fromMainAddress?: boolean) => {
      try {
        // Update OpenOrders Realtime
        queryClient.setQueryData(
          fromMainAddress
            ? QUERY_KEYS.openOrders(mainAddress, true)
            : QUERY_KEYS.openOrders(tradeAddress),
          (oldOpenOrders?: Order[]) => {
            const prevOpenOrders = [...(oldOpenOrders || [])];

            let updatedOpenOrders: Order[] = [];

            const findOrder = prevOpenOrders.find(
              (order) => order.orderId === payload.orderId
            );

            if (payload.status === "OPEN") {
              if (
                findOrder &&
                payload.filledQuantity > findOrder.filledQuantity
              ) {
                const notf = NOTIFICATIONS.partialFilledOrder(findOrder);
                onPushNotification(notf);
                onHandleInfo?.(notf.message, notf.description);
              }
              updatedOpenOrders = replaceOrPushOrder(prevOpenOrders, payload);
            } else {
              if (payload.status === "CANCELLED") {
                onPushNotification(NOTIFICATIONS.cancelOrder(payload));
              }
              if (findOrder && payload.status === "CLOSED") {
                const notf = NOTIFICATIONS.filledOrder(findOrder);
                onPushNotification(notf);
                onHandleInfo?.(notf.message, notf.description);
              }

              // Remove from Open Orders if it is closed
              updatedOpenOrders = removeOrderFromList(prevOpenOrders, payload);
            }
            return updatedOpenOrders;
          }
        );

        // Update OrderHistory Realtime
        queryClient.setQueryData(
          fromMainAddress
            ? QUERY_KEYS.orderHistory(
                dateFrom,
                dateTo,
                mainAddress,
                DEFAULT_BATCH_LIMIT,
                true
              )
            : QUERY_KEYS.orderHistory(
                dateFrom,
                dateTo,
                tradeAddress,
                DEFAULT_BATCH_LIMIT
              ),
          (
            oldOrderHistory: InfiniteData<MaybePaginated<Order[]>> | undefined
          ) => {
            const prevOrderHistory = [
              ...(oldOrderHistory?.pages?.flatMap((page) => page.data) ?? []),
            ];
            const oldOrderHistoryLength = oldOrderHistory
              ? oldOrderHistory?.pages?.length
              : 0;

            const nextToken =
              (oldOrderHistoryLength > 0 &&
                oldOrderHistory?.pages?.at(oldOrderHistoryLength - 1)
                  ?.nextToken) ||
              null;

            // Add to OrderHistory for all cases
            const updatedOrderHistory = replaceOrPushOrder(
              prevOrderHistory,
              payload
            );

            const newOrderHistory = {
              pages: [
                {
                  data: [...updatedOrderHistory],
                  nextToken,
                },
              ],
              pageParams: [...(oldOrderHistory?.pageParams ?? [])],
            };

            return newOrderHistory;
          }
        );
      } catch (error) {
        onHandleError(
          `Order updates channel ${(error as Error)?.message ?? error}`
        );
      }
    },
    [
      dateFrom,
      dateTo,
      onHandleError,
      queryClient,
      tradeAddress,
      mainAddress,
      onHandleInfo,
      onPushNotification,
    ]
  );

  const onRecentTradeUpdates = useCallback(
    (trade: PublicTrade) => {
      if (market) {
        queryClient.setQueryData(QUERY_KEYS.recentTrades(market), (oldData) => {
          const oldRecentTrades = oldData ? (oldData as PublicTrade[]) : [];
          return [trade, ...oldRecentTrades];
        });
      }
    },
    [market, queryClient]
  );

  const onOrderbookUpdates = useCallback(
    (payload: PriceLevel[]) => {
      if (!market) return;

      let book = {
        ask: [...asks],
        bid: [...bids],
      };

      const incrementalData = payload;
      incrementalData.forEach((item) => {
        if (Number(item.qty) === 0) {
          book = deleteFromBook(
            book,
            String(item.price),
            item.side.toLowerCase()
          );
        } else
          book = replaceOrAddToBook(
            book,
            String(item.price),
            String(item.qty),
            item.side.toLowerCase()
          );
      });

      queryClient.setQueryData(QUERY_KEYS.orderBook(market), () => {
        const newData = {
          asks: _.cloneDeep(book.ask),
          bids: _.cloneDeep(book.bid),
        };
        return newData;
      });
    },
    [asks, bids, market, queryClient]
  );

  const onUserTradeUpdate = useCallback(
    (payload: Trade) => {
      try {
        queryClient.setQueryData(
          QUERY_KEYS.tradeHistory(
            dateFrom,
            dateTo,
            tradeAddress,
            DEFAULT_BATCH_LIMIT
          ),
          (
            oldTradeHistory: InfiniteData<MaybePaginated<Trade[]>> | undefined
          ) => {
            const prevTradeHistory = [
              ...(oldTradeHistory?.pages?.flatMap((page) => page.data) ?? []),
            ];
            const oldTradeHistoryLength = oldTradeHistory?.pages?.length || 0;

            const nextToken =
              (oldTradeHistoryLength > 0 &&
                oldTradeHistory?.pages?.at(oldTradeHistoryLength - 1)
                  ?.nextToken) ||
              null;

            const newTradeHistory = {
              pages: [
                {
                  data: [payload, ...prevTradeHistory],
                  nextToken,
                },
              ],
              pageParams: [...(oldTradeHistory?.pageParams ?? [])],
            };

            return newTradeHistory;
          }
        );
      } catch (error) {
        onHandleError(
          `User trades channel error: ${(error as Error)?.message ?? error}`
        );
      }
    },
    [dateFrom, dateTo, onHandleError, queryClient, tradeAddress]
  );

  const onTransactionsUpdate = useCallback(
    (payload: Transaction) => {
      try {
        if (payload) {
          queryClient.setQueryData(
            QUERY_KEYS.transactions(mainAddress, payload.txType),
            (oldData: MaybePaginated<Transaction[]> | undefined) => {
              const transactions = _.cloneDeep(
                (oldData?.data || []) as Transaction[]
              );
              const index = transactions.findIndex(
                ({ stid }) => Number(stid) === Number(payload.stid)
              );
              if (index !== -1) {
                transactions[index] = payload;
              } else {
                transactions.push(payload);
              }
              return { data: transactions, nextToken: null };
            }
          );

          if (payload.txType === "WITHDRAW") {
            if (payload.status === "READY")
              onPushNotification(NOTIFICATIONS.claimTransfer(payload));
            else if (payload.status === "CONFIRMED")
              onPushNotification(
                NOTIFICATIONS.transferToFundingAccount(payload)
              );
          }
        }
      } catch (error) {
        onHandleError("Something has gone wrong while updating transactions");
      }
    },
    [mainAddress, onHandleError, queryClient, onPushNotification]
  );

  const onTickerUpdates = useCallback(
    (ticker: Ticker) => {
      queryClient.setQueryData(QUERY_KEYS.tickers(), (prevData?: Ticker[]) => {
        const newTickers = [...(prevData || [])];
        const idx = newTickers?.findIndex((x) => x.market === ticker.market);

        const priceChange = Number(ticker.close) - Number(ticker.open);
        const priceChangePercent = (priceChange / Number(ticker.open)) * 100;
        const market = markets?.find((market) => market.id === ticker.market);
        const pricePrecision = decimalPlaces(market?.price_tick_size || 0);

        const priceChange24Hr = _.round(priceChange, pricePrecision);
        const priceChangePercent24Hr = _.round(
          isNaN(priceChangePercent) ? 0 : priceChangePercent,
          pricePrecision
        );

        const newTickersData = {
          ...ticker,
          priceChange24Hr,
          priceChangePercent24Hr,
        };

        if (idx < 0) newTickers.push(newTickersData);
        else newTickers[idx] = newTickersData;
        return newTickers;
      });
    },
    [markets, queryClient]
  );

  const updateBalanceFromEvent = useCallback(
    async (msg: Balance) => {
      const assetId = msg.asset.id;

      const payload = {
        name: msg?.asset?.name || "",
        symbol: msg?.asset?.ticker || "",
        assetId: assetId.toString(),
        free_balance: msg.free,
        reserved_balance: msg.reserved,
      };

      if (!api) return { ...payload, onChainBalance: "0" };

      const onChainBalance = await fetchOnChainBalance(
        api,
        assetId,
        mainAddress
      );
      return { ...payload, onChainBalance: onChainBalance.toString() };
    },
    [api, mainAddress]
  );

  const onAccountsUpdate = useCallback(
    async (payload: AccountUpdateEvent) => {
      if (payload.type === "AddProxy" || payload.type === "RegisterAccount") {
        // Update for selected extension account
        queryClient.setQueryData(
          QUERY_KEYS.singleProxyAccounts(mainAddress),
          (proxies?: string[]): string[] => {
            return proxies ? [...proxies, payload.proxy] : [payload.proxy];
          }
        );

        // Update for all extension accounts
        queryClient.setQueryData(
          QUERY_KEYS.proxyAccounts(
            extensionAccounts.map(({ address }) => address)
          ),
          (userAddresses?: UserAddressTuple[]): UserAddressTuple[] => {
            return [
              ...(userAddresses || []),
              { mainAddress: payload.main, tradeAddress: payload.proxy },
            ];
          }
        );

        // Select newly created trading account
        await onUserSelectTradingAddress({
          tradeAddress: payload.proxy,
          isNew: true,
        });
      } else if (payload.type === "RemoveProxy") {
        // Update for selected extension account
        queryClient.setQueryData(
          QUERY_KEYS.singleProxyAccounts(mainAddress),
          (proxies?: string[]) => {
            return proxies?.filter((value) => value !== payload.proxy);
          }
        );

        // Update for all extension accounts
        queryClient.setQueryData(
          QUERY_KEYS.proxyAccounts(
            extensionAccounts.map(({ address }) => address)
          ),
          (userAddresses?: UserAddressTuple[]): UserAddressTuple[] => {
            return (userAddresses || [])?.filter(
              (e) => e.tradeAddress !== payload.proxy
            );
          }
        );
      }
    },
    [extensionAccounts, mainAddress, onUserSelectTradingAddress, queryClient]
  );

  const onBalanceUpdate = useCallback(
    async (payload: Balance) => {
      try {
        const { onChainBalance, ...updateBalance } =
          await updateBalanceFromEvent(payload);

        // Update trading account balance
        queryClient.refetchQueries({
          queryKey: QUERY_KEYS.tradingBalances(mainAddress),
        });

        // Update chain balance
        queryClient.setQueryData(
          QUERY_KEYS.onChainBalances(mainAddress),
          (prevData?: Map<string, number>) => {
            const oldData = new Map(prevData as Map<string, number>);
            oldData.set(updateBalance.assetId, Number(onChainBalance));
            return oldData;
          }
        );
      } catch (error) {
        onHandleError("Something has gone wrong while updating balance");
      }
    },
    [mainAddress, onHandleError, queryClient, updateBalanceFromEvent]
  );

  const processKline = (data: Kline, interval: string) => {
    const kline = {
      open: Number(data.open),
      close: Number(data.close),
      high: Number(data.high),
      low: Number(data.low),
      time: getCorrectTimestamp(data.timestamp.toISOString()),
      volume: Number(data.baseVolume),
    };
    const close = kline.close;
    const resolution = getResolutionInMilliSeconds(interval);

    const currentBucket =
      Math.floor(new Date().getTime() / resolution) * resolution;
    if (kline.time < currentBucket) {
      kline.open = close;
      kline.low = close;
      kline.high = close;
      kline.volume = 0;
      kline.time = currentBucket;
    }
    return kline;
  };

  const onCandleSubscribe = useCallback(
    ({
      market,
      interval: i,
      onUpdateTradingViewRealTime,
    }: T.CandleSubscriptionProps) => {
      if (!isReady) return;

      const interval = getAbsoluteResolution(i);

      appsyncOrderbookService.subscriber.subscribeKLines(
        market,
        interval.toLowerCase(),
        (data) => {
          const kline = processKline(data, interval);
          onUpdateTradingViewRealTime(kline);
        }
      );
    },
    [isReady]
  );

  // Recent Trades subscription
  useEffect(() => {
    if (!isReady || !market) return;

    const subscription =
      appsyncOrderbookService.subscriber.subscribeLatestTrades(
        market,
        onRecentTradeUpdates
      );

    return () => subscription.unsubscribe();
  }, [isReady, market, onRecentTradeUpdates]);

  // Orderbook subscription
  useEffect(() => {
    if (!market || !isReady) return;

    const subscription = appsyncOrderbookService.subscriber.subscribeOrderbook(
      market,
      onOrderbookUpdates
    );
    return () => subscription.unsubscribe();
  }, [isReady, market, onOrderbookUpdates, queryClient]);

  // Open Orders & Order history subscription (For tradeAddress)
  useEffect(() => {
    if (tradeAddress?.length && isReady) {
      const subscription = appsyncOrderbookService.subscriber.subscribeOrders(
        tradeAddress,
        onOrderUpdates
      );

      return () => subscription.unsubscribe();
    }
  }, [tradeAddress, onOrderUpdates, isReady]);

  // Open Orders & Order history subscription (For mainAddress)
  useEffect(() => {
    if (mainAddress?.length && isReady) {
      const subscription = appsyncOrderbookService.subscriber.subscribeOrders(
        mainAddress,
        (e) => onOrderUpdates(e, true)
      );

      return () => subscription.unsubscribe();
    }
  }, [mainAddress, onOrderUpdates, isReady]);

  // Trade history subscription
  useEffect(() => {
    if (tradeAddress?.length && isReady) {
      const subscription =
        appsyncOrderbookService.subscriber.subscribeUserTrades(
          tradeAddress,
          onUserTradeUpdate
        );
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [tradeAddress, isReady, onUserTradeUpdate]);

  // Transactions subscription
  useEffect(() => {
    if (mainAddress && isReady) {
      const subscription =
        appsyncOrderbookService.subscriber.subscribeTransactions(
          mainAddress,
          onTransactionsUpdate
        );

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [mainAddress, onTransactionsUpdate, isReady]);

  // Tickers subscription
  useEffect(() => {
    if (!market || !isReady) return;

    const subscription = appsyncOrderbookService.subscriber.subscribeTicker(
      market,
      onTickerUpdates
    );

    return () => subscription.unsubscribe();
  }, [queryClient, markets, isReady, market, onTickerUpdates]);

  // Balances subscription
  useEffect(() => {
    if (mainAddress && isReady) {
      const subscription = appsyncOrderbookService.subscriber.subscribeBalances(
        mainAddress,
        onBalanceUpdate
      );
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [mainAddress, onBalanceUpdate, isReady]);

  // Account update subscription
  useEffect(() => {
    if (mainAddress && isReady) {
      const subscription =
        appsyncOrderbookService.subscriber.subscribeAccountUpdate(
          mainAddress,
          onAccountsUpdate
        );
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [isReady, mainAddress, onAccountsUpdate]);

  return <Provider value={{ onCandleSubscribe }}>{children}</Provider>;
};
