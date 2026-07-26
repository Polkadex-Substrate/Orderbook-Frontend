import type { DriveStep } from "driver.js";

import { IS_TESTNET } from "@/config/network";

export const headerStep: DriveStep = {
  element: '[data-tour="header"]',
  popover: {
    title: "Navigation Bar",
    description:
      "Trade, Bridge, Rewards and Faucet live here, along with Analytics and community links. Connect your wallet from the top-right.",
    side: "bottom",
    align: "start",
  },
};

/** Testnet-only: the faucet is the sole way to get funds here. */
export const faucetStep: DriveStep = {
  element: '[data-tour="fund-account-btn"]',
  popover: {
    title: "Get Testnet Tokens",
    description:
      "Everything here is test funds with no real value. Open Fund Account and use the Faucet to claim some, then move them to your trading account. Bridging from Sepolia works too.",
    side: "bottom",
    align: "end",
  },
};

export const marketSelectorStep: DriveStep = {
  element: '[data-tour="market-selector"]',
  popover: {
    title: "Market Selector",
    description:
      "Your active trading pair is shown here with live price, 24h change, high/low, and volume. Click the pair name to browse all available markets.",
    side: "bottom",
    align: "start",
  },
};

export const chartStep: DriveStep = {
  element: '[data-tour="price-chart"]',
  popover: {
    title: "Price Chart",
    description:
      "Candlestick chart with OHLCV data. Hover over any candle to inspect open, high, low, and close values in the legend overlay.",
    side: "bottom",
    align: "center",
  },
};

export const orderbookStep: DriveStep = {
  element: '[data-tour="orderbook"]',
  popover: {
    title: "Order Book",
    description:
      "Live buy (green) and sell (red) orders by price. Click a row to fill both the price and the amount into the order form; click just the amount or total cell to copy only that value.",
    side: "left",
    align: "center",
  },
};

export const recentTradesStep: DriveStep = {
  element: '[data-tour="recent-trades"]',
  popover: {
    title: "Markets & Recent Trades",
    description:
      "Switch between Markets - a list of all trading pairs - and Recent Trades, showing the latest executions on the current pair in real time.",
    side: "left",
    align: "center",
  },
};

export const placeOrderStep: DriveStep = {
  element: '[data-tour="place-order"]',
  popover: {
    title: "Place an Order",
    description:
      "Limit sets your own price; Market fills instantly at the best available. If an order needs more than your trading balance, the button becomes 'Move X & Buy' - it deposits the shortfall from your funding account and places the order once it clears.",
    side: "top",
    align: "start",
  },
};

export const ordersStep: DriveStep = {
  element: '[data-tour="orders-panel"]',
  popover: {
    title: "Your Activity",
    description:
      "Track Open Orders, Order History, Trade History, and Balances - all in one panel. Filters let you view only buys or sells within a custom date range.",
    side: "top",
    align: "center",
  },
};

export function getTradingSteps(width: number): DriveStep[] {
  // The faucet step only makes sense where a faucet exists. Anchored to the
  // Fund Account button, which is also where the faucet card now lives.
  const funding = IS_TESTNET ? [faucetStep] : [];

  if (width >= 1280) {
    return [
      headerStep,
      ...funding,
      marketSelectorStep,
      chartStep,
      orderbookStep,
      recentTradesStep,
      placeOrderStep,
      ordersStep,
    ];
  }

  if (width >= 954) {
    return [
      headerStep,
      ...funding,
      marketSelectorStep,
      chartStep,
      orderbookStep,
      placeOrderStep,
      ordersStep,
    ];
  }

  return [
    headerStep,
    ...funding,
    marketSelectorStep,
    chartStep,
    placeOrderStep,
    ordersStep,
  ];
}
