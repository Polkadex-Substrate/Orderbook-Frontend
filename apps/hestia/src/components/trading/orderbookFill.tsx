"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

export type FillField = "price" | "amount" | "total";

/**
 * Signals that the orderbook filled one or more order-form fields.
 *
 * Why an explicit signal rather than watching the values:
 *
 * The previous approach flashed a field when its value CHANGED. That misses
 * every case where a fill writes the value it already had, and there are
 * several:
 *
 *  - clicking the same row twice
 *  - clicking a different row at the same price
 *  - `changeMarketPrice` in @orderbook/core skips the state update entirely
 *    when the price matches (`if (+currentPrice !== priceToSet)`), while
 *    `changeMarketAmount` always writes - so one field could flash and the
 *    other stay dead on the very same click
 *
 * The result looked random, because it depended on how the clicked row
 * compared with whatever was already in the form. A click is a discrete event
 * and the feedback should follow the event.
 *
 * Each field carries its own counter so a price-only click does not flash the
 * amount, and vice versa.
 */
type FillCounters = Record<FillField, number>;

const ZERO: FillCounters = { price: 0, amount: 0, total: 0 };

const OrderbookFillContext = createContext<{
  counters: FillCounters;
  notifyFill: (...fields: FillField[]) => void;
}>({ counters: ZERO, notifyFill: () => {} });

export const OrderbookFillProvider = ({ children }: PropsWithChildren) => {
  const [counters, setCounters] = useState<FillCounters>(ZERO);

  const notifyFill = useCallback((...fields: FillField[]) => {
    setCounters((prev) => {
      const next = { ...prev };
      for (const f of fields) next[f] = prev[f] + 1;
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ counters, notifyFill }),
    [counters, notifyFill]
  );

  return (
    <OrderbookFillContext.Provider value={value}>
      {children}
    </OrderbookFillContext.Provider>
  );
};

/** Call after writing form values from an orderbook interaction. */
export const useNotifyFill = () => useContext(OrderbookFillContext).notifyFill;

/**
 * True for `duration` ms after `field` is filled from the orderbook.
 *
 * Fires on every fill, including one that writes an identical value, because
 * the user still clicked and still needs to see that it landed.
 */
export function useFlashOnFill(field: FillField, duration = 800) {
  const { counters } = useContext(OrderbookFillContext);
  const count = counters[field];
  const [flash, setFlash] = useState(false);
  const seen = useRef(count);

  useEffect(() => {
    // Skip the initial render: mounting is not a fill.
    if (count === seen.current) return;
    seen.current = count;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), duration);
    return () => clearTimeout(t);
  }, [count, duration]);

  return flash;
}
