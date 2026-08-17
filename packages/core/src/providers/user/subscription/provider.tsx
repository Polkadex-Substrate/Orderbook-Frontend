"use client";

import _ from "lodash";
import { useCallback, useEffect, useRef } from "react";
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
  LOCAL_STORAGE_ID,
  NOTIFICATIONS,
  RECENT_TRADES_LIMIT,
} from "@orderbook/core/constants";
import { useOrderbookService } from "@orderbook/core/providers/public/orderbookServiceProvider/useOrderbookService";
import {
  initialSeqState,
  nextSeqDecision,
  SeqState,
} from "@orderbook/core/utils/orderbookService/appsync/bookSequence";
import {
  decimalPlaces,
  deleteFromBook,
  fetchOnChainBalance,
  getFromStorage,
  isFillSoundEnabled,
  playFillSound,
  shouldPlayFillSound,
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
import { useExtensionAccounts } from "@aksumite/react-providers";

import { UserAddressTuple, useProfile } from "../profile";
import { useSettingsProvider } from "../../public/settings";
import { useSessionProvider } from "../sessionProvider";
import { useNativeApi } from "../../public/nativeApi";

import { orderUpdateNotice } from "./orderUpdateNotice";
import { Provider } from "./context";
import * as T from "./types";
import { useLatest } from "./useLatest";

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

            // What to TELL the user is decided in orderUpdateNotice, away from
            // the cache bookkeeping. The old code gated both fill notices on
            // `findOrder` - the order already being in this list - and an order
            // that fills INSTANTLY never gets into it. One CLOSED update
            // arrived, found nothing, said nothing, and the order was absent
            // from Open Orders as well, so every signal on screen said it had
            // vanished. That was the report.
            //
            // The notification is built from the PAYLOAD, which carries side,
            // type, quantity and market - everything the message needs.
            // `findOrder` is now only used to tell a fresh partial fill from a
            // repeat of one already announced.
            const notice = orderUpdateNotice(payload, findOrder);
            if (notice.kind === "cancelled") {
              onPushNotification(NOTIFICATIONS.cancelOrder(payload));
            } else if (notice.kind !== "none") {
              const notf =
                notice.kind === "filled"
                  ? NOTIFICATIONS.filledOrder(payload)
                  : NOTIFICATIONS.partialFilledOrder(payload);
              onPushNotification(notf);
              onHandleInfo?.(notf.message, notf.description);
            }

            // The optional fill chime, requested because a trader watching the
            // order book can miss a toast in the corner. Off unless the user
            // turned it on; silent in a background tab. Deliberately placed
            // AFTER the toast so the sound never arrives without the message
            // that explains it, and it reads the setting on every fill rather
            // than caching it so a change in another tab takes effect at once.
            if (
              shouldPlayFillSound({
                kind: notice.kind,
                enabled: isFillSoundEnabled(
                  getFromStorage(LOCAL_STORAGE_ID.FILL_SOUND)
                ),
                documentHidden:
                  typeof document !== "undefined" && document.hidden,
              })
            ) {
              playFillSound();
            }

            if (payload.status === "OPEN") {
              updatedOpenOrders = replaceOrPushOrder(prevOpenOrders, payload);
            } else {
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
          // Keep the list bounded to what the initial query fetches.
          return [trade, ...oldRecentTrades].slice(0, RECENT_TRADES_LIMIT);
        });
      }
    },
    [market, queryClient]
  );

  // Highest increment sequence applied to the book, per market. A ref rather
  // than state: it must not trigger a render, and it must be readable inside
  // the subscription callback without making that callback change identity -
  // which would tear down and re-create the websocket on every tick, dropping
  // the very increments this is meant to protect.
  const bookSeq = useRef<{ market: string | null; state: SeqState }>({
    market: null,
    state: initialSeqState(),
  });

  const onOrderbookUpdates = useCallback(
    (payload: PriceLevel[]) => {
      if (!market) return;

      // A market switch invalidates the sequence: the numbers belong to the
      // stream, not to us.
      if (bookSeq.current.market !== market) {
        bookSeq.current = { market, state: initialSeqState() };
      }

      const decision = nextSeqDecision(bookSeq.current.state, payload);

      if (decision.action === "skip") {
        // A replay or an out-of-order duplicate. Applying it would double-count.
        return;
      }

      if (decision.action === "resync") {
        // The local book has diverged from the engine and cannot be repaired by
        // applying this increment on top - that is precisely how an order stays
        // missing until the 30s poll. Drop the baseline and refetch the
        // snapshot; the next increment re-baselines against it.
        bookSeq.current = { market, state: { lastSeq: null } };
        console.warn(`[orderbook] ${market}: ${decision.reason}. Resyncing.`);
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.orderBook(market),
        });
        return;
      }

      bookSeq.current = { market, state: { lastSeq: decision.nextSeq } };

      // Functional update against the CACHE, not component state. The old
      // version closed over useOrderbook's asks/bids, which (a) made this
      // callback change identity on every tick, so the websocket
      // subscription was torn down and re-created continuously - dropping
      // increments in the gaps - and (b) during a market switch still held
      // the PREVIOUS market's book, seeding the new market's cache with it
      // (the "data flaps when clicking through markets" bug). It also wrote
      // merged numeric tuples into a cache that stores raw string tuples.
      queryClient.setQueryData(
        QUERY_KEYS.orderBook(market),
        (prev?: { asks: string[][]; bids: string[][] }) => {
          let book = {
            ask: [...(prev?.asks ?? [])],
            bid: [...(prev?.bids ?? [])],
          };

          payload.forEach((item) => {
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

          return { asks: book.ask, bids: book.bid };
        }
      );
    },
    [market, queryClient]
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

          if (payload.txType === "DEPOSIT") {
            onPushNotification(NOTIFICATIONS.transferToTradingAccount(payload));
          } else if (payload.txType === "WITHDRAW") {
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

  /*
   * EVERY SUBSCRIPTION BELOW READS ITS HANDLER THROUGH A REF.
   *
   * These effects used to list the handler in their dependency arrays, so each
   * socket was torn down and re-created whenever the HANDLER changed identity -
   * which says nothing about whether the subscription should exist.
   *
   * `onOrderUpdates` depends on `onHandleError`, `onHandleInfo` and
   * `onPushNotification`, all of which came from SettingProvider with a fresh
   * identity on every render. So an order update called `onPushNotification`,
   * which changed settings state, which re-rendered that provider, which gave
   * the handler a new identity, which unsubscribed and resubscribed the exact
   * channel that had just delivered the event. Notifying the user destroyed the
   * subscription, and anything arriving in the gap was lost.
   *
   * Reported as three separate bugs: a filled order not appearing until you
   * switched tabs and came back (the 30s poll and the focus refetch were doing
   * all the work), and no fill notification at all.
   *
   * The dependency arrays now say only what they mean: an address, a market,
   * and whether the service is ready. See useLatest.ts.
   */
  const recentTradeRef = useLatest(onRecentTradeUpdates);
  const orderbookRef = useLatest(onOrderbookUpdates);
  const orderUpdatesRef = useLatest(onOrderUpdates);
  const userTradeRef = useLatest(onUserTradeUpdate);
  const transactionsRef = useLatest(onTransactionsUpdate);
  const tickerRef = useLatest(onTickerUpdates);
  const balanceRef = useLatest(onBalanceUpdate);
  const accountsRef = useLatest(onAccountsUpdate);

  // Recent Trades subscription
  useEffect(() => {
    if (!isReady || !market) return;

    const subscription =
      appsyncOrderbookService.subscriber.subscribeLatestTrades(market, (e) =>
        recentTradeRef.current(e)
      );

    return () => subscription.unsubscribe();
  }, [isReady, market, recentTradeRef]);

  // Orderbook subscription
  useEffect(() => {
    if (!market || !isReady) return;

    const subscription = appsyncOrderbookService.subscriber.subscribeOrderbook(
      market,
      (e) => orderbookRef.current(e)
    );
    return () => subscription.unsubscribe();
  }, [isReady, market, orderbookRef]);

  // Open Orders & Order history subscription (For tradeAddress)
  useEffect(() => {
    if (tradeAddress?.length && isReady) {
      const subscription = appsyncOrderbookService.subscriber.subscribeOrders(
        tradeAddress,
        (e) => orderUpdatesRef.current(e)
      );

      return () => subscription.unsubscribe();
    }
  }, [tradeAddress, isReady, orderUpdatesRef]);

  // Open Orders & Order history subscription (For mainAddress)
  useEffect(() => {
    if (mainAddress?.length && isReady) {
      const subscription = appsyncOrderbookService.subscriber.subscribeOrders(
        mainAddress,
        (e) => orderUpdatesRef.current(e, true)
      );

      return () => subscription.unsubscribe();
    }
  }, [mainAddress, isReady, orderUpdatesRef]);

  // Trade history subscription
  useEffect(() => {
    if (tradeAddress?.length && isReady) {
      const subscription =
        appsyncOrderbookService.subscriber.subscribeUserTrades(
          tradeAddress,
          (e) => userTradeRef.current(e)
        );
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [tradeAddress, isReady, userTradeRef]);

  // Transactions subscription
  useEffect(() => {
    if (mainAddress && isReady) {
      const subscription =
        appsyncOrderbookService.subscriber.subscribeTransactions(
          mainAddress,
          (e) => transactionsRef.current(e)
        );

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [mainAddress, isReady, transactionsRef]);

  // Tickers subscription
  useEffect(() => {
    if (!market || !isReady) return;

    const subscription = appsyncOrderbookService.subscriber.subscribeTicker(
      market,
      (e) => tickerRef.current(e)
    );

    return () => subscription.unsubscribe();
  }, [isReady, market, tickerRef]);

  // Balances subscription
  useEffect(() => {
    if (mainAddress && isReady) {
      const subscription = appsyncOrderbookService.subscriber.subscribeBalances(
        mainAddress,
        (e) => balanceRef.current(e)
      );
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [mainAddress, isReady, balanceRef]);

  // Account update subscription
  useEffect(() => {
    if (mainAddress && isReady) {
      const subscription =
        appsyncOrderbookService.subscriber.subscribeAccountUpdate(
          mainAddress,
          (e) => accountsRef.current(e)
        );
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [isReady, mainAddress, accountsRef]);

  return <Provider value={{ onCandleSubscribe }}>{children}</Provider>;
};
