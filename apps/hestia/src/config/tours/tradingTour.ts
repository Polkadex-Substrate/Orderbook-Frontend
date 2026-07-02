import type { DriveStep } from "driver.js";

export const headerStep: DriveStep = {
  element: '[data-tour="header"]',
  popover: {
    title: "Navigation Bar",
    description:
      "Access all sections of Polkadex: Trade, Bridge, Rewards, Faucet, and community links. Connect your wallet from the top-right.",
    side: "bottom",
    align: "start",
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
      "Live buy (green) and sell (red) orders sorted by price. Click any row to automatically prefill that price in the order form.",
    side: "left",
    align: "center",
  },
};

export const recentTradesStep: DriveStep = {
  element: '[data-tour="recent-trades"]',
  popover: {
    title: "Markets & Recent Trades",
    description:
      "Switch between Markets — a list of all trading pairs — and Recent Trades, showing the latest executions on the current pair in real time.",
    side: "left",
    align: "center",
  },
};

export const placeOrderStep: DriveStep = {
  element: '[data-tour="place-order"]',
  popover: {
    title: "Place an Order",
    description:
      "Choose Limit (set your price) or Market (execute instantly at the best available price). Connect your wallet and fund your trading account to start.",
    side: "top",
    align: "start",
  },
};

export const ordersStep: DriveStep = {
  element: '[data-tour="orders-panel"]',
  popover: {
    title: "Your Activity",
    description:
      "Track Open Orders, Order History, Trade History, and Balances — all in one panel. Filters let you view only buys or sells within a custom date range.",
    side: "top",
    align: "center",
  },
};

export function getTradingSteps(width: number): DriveStep[] {
  if (width >= 1280) {
    return [
      headerStep,
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
      marketSelectorStep,
      chartStep,
      orderbookStep,
      placeOrderStep,
      ordersStep,
    ];
  }

  return [headerStep, marketSelectorStep, chartStep, placeOrderStep, ordersStep];
}
