import { useEffect, useRef } from "react";

/**
 * A ref that always holds the newest value, without participating in deps.
 *
 * THE BUG THIS EXISTS TO PREVENT
 * Every websocket subscription in this provider listed its handler in the
 * effect's dependency array:
 *
 *     }, [tradeAddress, onOrderUpdates, isReady]);
 *
 * So the socket was torn down and re-created whenever the HANDLER changed
 * identity, which has nothing to do with whether the subscription should exist.
 * `onOrderUpdates` depends on `onHandleError` and `onPushNotification`, which
 * came from `SettingProvider`, whose context value and toast callbacks were
 * rebuilt on every render. Pushing a notification changes settings state, which
 * re-renders that provider, which gives the handler a new identity, which
 * unsubscribes and resubscribes the channel that just delivered the event.
 *
 * The act of notifying the user destroyed the subscription. Any update arriving
 * in the gap was lost, which is why a filled order did not appear until the
 * 30-second poll or a tab switch triggered a refetch, and why fill
 * notifications went missing.
 *
 * The same pattern had already been found and fixed once in the orderbook
 * handler in this file - see the note about the callback that "changed identity
 * on every tick". Only that one instance was fixed. This is the general form.
 *
 * WHAT THE RULE IS
 * A subscription's lifetime depends on WHAT IT SUBSCRIBES TO - an address, a
 * market, whether the service is ready - and never on the function that handles
 * its messages. Read the handler through this ref and the dependency array can
 * say only what it means.
 */
export function useLatest<T>(value: T) {
  const ref = useRef(value);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref;
}
