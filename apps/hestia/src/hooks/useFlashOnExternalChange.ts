"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Flash feedback for form values that can be set from OUTSIDE the input —
 * e.g. clicking a row in the orderbook fills the PlaceOrder price/amount.
 * Returns `true` for `duration` ms whenever `value` changes while the user
 * is NOT typing in an input, so callers can highlight the field.
 *
 * The "external" heuristic: orderbook clicks land on a div/span, so during
 * such an update `document.activeElement` is not an input. When the user is
 * typing, the focused element IS an input — no flash.
 */
export function useFlashOnExternalChange(value: string, duration = 800) {
  const [flash, setFlash] = useState(false);
  const prev = useRef(value);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      prev.current = value;
      return;
    }
    if (value === prev.current) return;
    prev.current = value;

    if (
      typeof document !== "undefined" &&
      (document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement)
    ) {
      return; // user is typing — the change is their own
    }

    setFlash(true);
    const t = setTimeout(() => setFlash(false), duration);
    return () => clearTimeout(t);
  }, [value, duration]);

  return flash;
}
