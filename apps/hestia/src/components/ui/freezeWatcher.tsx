"use client";

import { useEffect, useRef } from "react";
import * as Sentry from "@sentry/nextjs";

import {
  FREEZE_TICK_MS,
  freezeMessage,
  freezeVerdict,
} from "@/components/ui/freezeWatch";

/**
 * Watches the main thread for the whole page lifetime, not just while the
 * testnet notice is up.
 *
 * WHY THIS EXISTS SEPARATELY FROM TestnetModal
 * The drift detector was first wired into the modal's own interval, which only
 * runs while the modal is open. The report is "the page freezes ON LOAD", and
 * load is exactly the window where the modal may not have mounted yet: it is a
 * `dynamic(..., { ssr: false })` component, so it appears only after hydration
 * and after its chunk arrives. A freeze during hydration - the most likely
 * moment, since that is when the largest amount of JavaScript executes - would
 * have gone unrecorded, and an empty Sentry would again have been read as
 * "nothing happened".
 *
 * Mounted in the root layout so it starts as early as any client component can.
 *
 * WHY IT IS SAFE TO RUN ALWAYS
 * One 1s interval doing two Date subtractions. That is orders of magnitude less
 * work than a single React render, so it cannot meaningfully contribute to the
 * problem it measures. It reports at most once per page load.
 *
 * It renders nothing.
 */
export const FreezeWatcher = () => {
  const reported = useRef(false);

  useEffect(() => {
    const startedAt = Date.now();
    let lastTickAt = startedAt;
    // Any hidden moment inside a gap disqualifies it: background tabs have
    // their timers throttled to roughly once a minute, which is
    // indistinguishable from a long freeze.
    let stayedVisible = document.visibilityState === "visible";
    const onVisibility = () => {
      if (document.visibilityState !== "visible") stayedVisible = false;
    };
    document.addEventListener("visibilitychange", onVisibility);

    const id = setInterval(() => {
      const now = Date.now();
      const gapMs = now - lastTickAt;
      lastTickAt = now;

      const verdict = freezeVerdict({
        gapMs,
        tickMs: FREEZE_TICK_MS,
        wasVisibleThroughout: stayedVisible,
        alreadyReported: reported.current,
      });
      stayedVisible = document.visibilityState === "visible";

      if (verdict.frozen) {
        reported.current = true;
        Sentry.captureMessage(freezeMessage(verdict.blockedForMs), {
          level: "error",
          extra: {
            blockedForMs: verdict.blockedForMs,
            clamped: verdict.clamped,
            // How far into the page's life it happened. A freeze at 2s is
            // hydration; one at 90s is something the user did.
            sinceLoadMs: now - startedAt,
            documentReadyState: document.readyState,
            path:
              typeof location === "undefined" ? "unknown" : location.pathname,
          },
        });
      }
    }, FREEZE_TICK_MS);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
};
