"use client";

import { useCallback, useEffect, useRef } from "react";
import { useConnectWalletProvider } from "@orderbook/core/providers/user/connectWalletProvider";
import type { Config, Driver, DriveStep } from "driver.js";

import { getTradingSteps } from "@/config/tours/tradingTour";
import { getOnboardingSteps } from "@/config/tours/onboardingTour";

const TOUR_KEY = "trading-tour-v1";

const BASE_CONFIG: Omit<Config, "steps"> = {
  showProgress: true,
  progressText: "{{current}} / {{total}}",
  animate: true,
  smoothScroll: true,
  allowClose: true,
  overlayOpacity: 0.65,
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

  // Auto-start on first visit — runs once on mount, reads latest provider
  // state after the delay so it isn't stale from initial render.
  useEffect(() => {
    const seen = localStorage.getItem(TOUR_KEY);
    if (seen) return;

    const timer = setTimeout(async () => {
      if (typeof window === "undefined") return;

      const {
        extensionAccountPresent,
        mainProxiesAccounts,
        selectedTradingAccount,
      } = stateRef.current;

      const hasProxyAccounts = mainProxiesAccounts.length > 0;
      const hasTradingAccount = !!selectedTradingAccount;

      if (extensionAccountPresent && hasTradingAccount) {
        // Fully set up — show the interface tour.
        await launchTour(getTradingSteps(window.innerWidth));
      } else {
        // Incomplete setup — show the onboarding tour.
        await launchTour(
          getOnboardingSteps(
            extensionAccountPresent,
            hasProxyAccounts,
            hasTradingAccount,
            window.innerWidth
          )
        );
      }
    }, 900);

    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      driverRef.current?.destroy();
    };
  }, []);

  return { startTour };
}
