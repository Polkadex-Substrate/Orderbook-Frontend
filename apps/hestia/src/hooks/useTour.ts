"use client";

import { useCallback, useEffect, useRef } from "react";
import { useConnectWalletProvider } from "@orderbook/core/providers/user/connectWalletProvider";
import type { Config, Driver, DriveStep } from "driver.js";

import { getTradingSteps } from "@/config/tours/tradingTour";
import { getOnboardingSteps } from "@/config/tours/onboardingTour";
import { TESTNET_ACK_EVENT, isTestnetAcknowledged } from "@/config/network";

// Bumped from v1: the steps were rewritten for the current funding flow
// (faucet, Fund Account, Move & Trade), so returning users should see it once.
const TOUR_KEY = "trading-tour-v2";

/**
 * Resolve once nothing is covering the viewport.
 *
 * The testnet notice is a full-screen modal shown on mount. If the tour starts
 * while it is open, driver.js highlights elements *behind* the backdrop: the
 * spotlight is hidden, so the popover appears to point into a black screen.
 */
function waitForClearViewport(signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (isTestnetAcknowledged()) return resolve();
    const done = () => {
      window.removeEventListener(TESTNET_ACK_EVENT, done);
      signal.removeEventListener("abort", done);
      if (!signal.aborted) resolve();
    };
    window.addEventListener(TESTNET_ACK_EVENT, done, { once: true });
    signal.addEventListener("abort", done, { once: true });
  });
}

const BASE_CONFIG: Omit<Config, "steps"> = {
  showProgress: true,
  progressText: "{{current}} / {{total}}",
  animate: true,
  smoothScroll: true,
  allowClose: true,
  // The ONLY correct way to tint the overlay. Styling .driver-overlay in CSS
  // covers the spotlight cutout - see the note in styles/tour.css.
  overlayColor: "#06070A",
  overlayOpacity: 0.7,
  stagePadding: 6,
  stageRadius: 6,
  popoverClass: "polkadex-tour-popover",
  nextBtnText: "Next →",
  prevBtnText: "← Back",
  doneBtnText: "Done",
};

export function useTour() {
  const driverRef = useRef<Driver | null>(null);

  const {
    extensionAccountPresent,
    mainProxiesAccounts,
    selectedTradingAccount,
  } = useConnectWalletProvider();

  // Keep a ref to the latest state so the one-time auto-start effect
  // can read the current values when the delay fires.
  const stateRef = useRef({
    extensionAccountPresent,
    mainProxiesAccounts,
    selectedTradingAccount,
  });
  useEffect(() => {
    stateRef.current = {
      extensionAccountPresent,
      mainProxiesAccounts,
      selectedTradingAccount,
    };
  }, [extensionAccountPresent, mainProxiesAccounts, selectedTradingAccount]);

  const launchTour = useCallback(async (steps: DriveStep[]) => {
    if (typeof window === "undefined" || steps.length === 0) return;

    driverRef.current?.destroy();

    const { driver } = await import("driver.js");

    driverRef.current = driver({
      ...BASE_CONFIG,
      steps,
      onDestroyed: () => {
        localStorage.setItem(TOUR_KEY, "true");
      },
    });

    driverRef.current.drive();
  }, []);

  // Exposed: always launches the full trading interface tour regardless of state.
  const startTour = useCallback(async () => {
    if (typeof window === "undefined") return;
    await launchTour(getTradingSteps(window.innerWidth));
  }, [launchTour]);

  // Auto-start on first visit - waits for the testnet notice to be dismissed,
  // then reads the latest provider state so it isn't stale from first render.
  useEffect(() => {
    if (localStorage.getItem(TOUR_KEY)) return;

    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      // Blocks until the modal is gone (resolves immediately if it never
      // showed). Previously a flat 900ms timer, which raced the modal.
      await waitForClearViewport(controller.signal);
      if (controller.signal.aborted || typeof window === "undefined") return;

      // Short settle so the modal's close animation finishes and driver.js
      // measures the final element positions rather than mid-transition ones.
      await new Promise<void>((resolve) => {
        timer = setTimeout(resolve, 400);
      });
      if (controller.signal.aborted) return;

      const {
        extensionAccountPresent,
        mainProxiesAccounts,
        selectedTradingAccount,
      } = stateRef.current;

      const hasProxyAccounts = mainProxiesAccounts.length > 0;
      const hasTradingAccount = !!selectedTradingAccount;

      if (extensionAccountPresent && hasTradingAccount) {
        // Fully set up - show the interface tour.
        await launchTour(getTradingSteps(window.innerWidth));
      } else {
        // Incomplete setup - show the onboarding tour.
        await launchTour(
          getOnboardingSteps(
            extensionAccountPresent,
            hasProxyAccounts,
            hasTradingAccount,
            window.innerWidth
          )
        );
      }
    })();

    return () => {
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      driverRef.current?.destroy();
    };
  }, []);

  return { startTour };
}
