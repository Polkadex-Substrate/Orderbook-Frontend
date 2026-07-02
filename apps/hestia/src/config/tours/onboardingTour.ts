import type { DriveStep } from "driver.js";

import {
  chartStep,
  orderbookStep,
  recentTradesStep,
  marketSelectorStep,
  placeOrderStep,
} from "./tradingTour";

// ─── Phase A: No wallet connected ────────────────────────────────────────────
// User just landed on the trading page with no extension connected.

const welcomeStep: DriveStep = {
  element: '[data-tour="header"]',
  popover: {
    title: "Welcome to Polkadex Orderbook",
    description:
      "A fully non-custodial DEX built on Polkadex Chain. Let's walk through 3 steps to get you trading: connect your wallet, create a trading account, and fund it.",
    side: "bottom",
    align: "start",
  },
};

const connectWalletStep: DriveStep = {
  element: '[data-tour="connect-wallet-btn"]',
  popover: {
    title: "Step 1 — Connect Your Funding Wallet",
    description:
      "Click 'Connect wallet' to link your Polkadot extension (Polkadot.js, Talisman, or SubWallet). Select the account that holds your PDEX tokens — this becomes your main on-chain account.",
    side: "bottom",
    align: "end",
  },
};

const createTradingAccountStep: DriveStep = {
  element: '[data-tour="orders-panel"]',
  popover: {
    title: "Step 2 — Create a Trading Account",
    description:
      "After connecting, you'll be guided to create a Trading Account — a lightweight on-chain proxy that executes orders on your behalf without gas fees. Requires a small PDEX deposit from your funding wallet.",
    side: "top",
    align: "center",
  },
};

const fundConceptStep: DriveStep = {
  element: '[data-tour="place-order"]',
  popover: {
    title: "Step 3 — Fund & Trade",
    description:
      "Once your trading account is created, click 'Fund Account' (top-right) to deposit tokens. You can bridge from another chain, transfer from your Polkadex wallet, or use a CEX on-ramp. Then use this form to place your first order!",
    side: "top",
    align: "start",
  },
};

// ─── Phase B: Wallet connected, no proxy/trading accounts yet ─────────────────
// User connected their extension wallet but hasn't created a trading account.

const noTradingAccountStep: DriveStep = {
  element: '[data-tour="orders-panel"]',
  popover: {
    title: "Create a Trading Account",
    description:
      "Your funding wallet is connected. Next, create a Trading Account — a proxy that executes trades on Polkadex without gas fees. You'll be prompted automatically, or find the option in your profile (top-right).",
    side: "top",
    align: "center",
  },
};

const fundAfterTradingAccountStep: DriveStep = {
  element: '[data-tour="fund-account-btn"]',
  popover: {
    title: "Fund Your Trading Account",
    description:
      "Once your trading account is created, click here to transfer tokens to it. Choose between Bridge (cross-chain), Transfer (already on Polkadex), or CEX On-Ramp.",
    side: "bottom",
    align: "end",
  },
};

// ─── Phase C: Has proxy accounts but no trading account selected in browser ───
// User registered proxy accounts on-chain but hasn't connected one in this browser session.

const reconnectTradingStep: DriveStep = {
  element: '[data-tour="orders-panel"]',
  popover: {
    title: "Connect Your Trading Account",
    description:
      "You have a registered trading account. Click 'Connect Trading Account' here (or go to your profile at top-right) to activate it for this session.",
    side: "top",
    align: "center",
  },
};

const transferFundsStep: DriveStep = {
  element: '[data-tour="fund-account-btn"]',
  popover: {
    title: "Transfer to Start Trading",
    description:
      "Need to top up? Click 'Fund Account' to deposit tokens into your trading account. Use 'Transfer to trading account' for assets already on Polkadex, or Bridge for cross-chain transfers.",
    side: "bottom",
    align: "end",
  },
};

// ─── Viewport-aware interface steps appended to every phase ──────────────────

function appendInterfaceSteps(steps: DriveStep[], width: number): DriveStep[] {
  steps.push(marketSelectorStep);
  steps.push(chartStep);
  if (width >= 1280) {
    steps.push(orderbookStep);
    steps.push(recentTradesStep);
  } else if (width >= 954) {
    steps.push(orderbookStep);
  }
  steps.push(placeOrderStep);
  return steps;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getOnboardingSteps(
  extensionAccountPresent: boolean,
  hasProxyAccounts: boolean,
  hasTradingAccount: boolean,
  width: number
): DriveStep[] {
  if (!extensionAccountPresent) {
    // Phase A — Complete newcomer
    return appendInterfaceSteps(
      [welcomeStep, connectWalletStep, createTradingAccountStep, fundConceptStep],
      width
    );
  }

  if (!hasProxyAccounts) {
    // Phase B — Wallet connected, trading account needed
    return appendInterfaceSteps(
      [noTradingAccountStep, fundAfterTradingAccountStep],
      width
    );
  }

  // Phase C — Trading accounts exist but none active in browser
  return appendInterfaceSteps(
    [reconnectTradingStep, transferFundsStep],
    width
  );
}
