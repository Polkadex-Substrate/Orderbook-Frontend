import {
  Order,
  OrderSide,
  OrderType,
  Transaction,
} from "@orderbook/core/utils/orderbookService";
import { NotificationPayload } from "@orderbook/core/providers/public/settings";
export const NOTIFICATIONS = {
  placeOrder: (
    _side: OrderSide,
    _type: OrderType,
    quantity: number,
    baseTicker: string,
    quoteTicker: string
  ): NotificationPayload => {
    const isSell = _side === "Ask";
    const side = isSell ? "Sell" : "Buy";
    const type = _type.charAt(0) + _type.toLowerCase().slice(1);
    return {
      category: "General",
      message: `${type} ${side} Order Placed 🎉`,
      description: `Placed exchange ${type.toLowerCase()} ${side.toLowerCase()} order for ${quantity} ${baseTicker} by using ${quoteTicker}.`,
      type: "Success",
      href: "/history?tab=openOrders",
    };
  },
  cancelOrder: (order: Order): NotificationPayload => {
    const isSell = order.side === "Ask";
    const type = order.type.charAt(0) + order.type.toLowerCase().slice(1);
    const side = isSell ? "Sell" : "Buy";
    return {
      category: "General",
      message: `${type} ${side} Order Cancelled`,
      description: `Cancelled exchange ${type.toLowerCase()} ${side.toLowerCase()} order for ${order.quantity} ${order.market.baseAsset.ticker}.`,
      type: "Information",
      href: "/history?tab=orderHistory",
    };
  },
  partialFilledOrder: (order: Order): NotificationPayload => {
    const isSell = order.side === "Ask";
    const type = order.type.charAt(0) + order.type.toLowerCase().slice(1);
    const side = isSell ? "Sell" : "Buy";
    return {
      category: "General",
      message: `${type} ${side} Order Partially Filled`,
      description: `Partial filled exchange ${type.toLowerCase()} ${side.toLowerCase()} order for ${order.quantity} ${order.market.baseAsset.ticker} by using ${order.market.quoteAsset.ticker}.`,
      type: "Information",
      href: "/history?tab=openOrders",
    };
  },
  filledOrder: (order: Order): NotificationPayload => {
    const isSell = order.side === "Ask";
    const type = order.type.charAt(0) + order.type.toLowerCase().slice(1);
    const side = isSell ? "Sell" : "Buy";
    return {
      category: "General",
      message: `${type} ${side} Order Filled 🎉`,
      description: `Filled exchange ${type.toLowerCase()} ${side.toLowerCase()} order for ${order.quantity} ${order.market.baseAsset.ticker} by using ${order.market.quoteAsset.ticker}.`,
      type: "Information",
      href: "/history?tab=orderHistory",
    };
  },
  transferToTradingAccount: (tx: Transaction): NotificationPayload => {
    return {
      category: "General",
      message: `${tx.amount} ${tx.asset.ticker} Transfer 🎉`,
      description: `Your transfer of ${tx.amount} ${tx.asset.ticker} from your funding account to your trading account has been successfully processed.`,
      type: "Success",
      href: "/history",
    };
  },
  claimTransfer: (tx: Transaction): NotificationPayload => {
    return {
      category: "General",
      message: `Transfer ready to claim 🎉`,
      description: `Your transfer of ${tx.amount} ${tx.asset.ticker} from your trading account to your funding account is ready to claim.`,
      type: "Success",
      href: "/transfer",
    };
  },
  transferToFundingAccount: (tx: Transaction): NotificationPayload => {
    return {
      category: "General",
      message: `${tx.amount} ${tx.asset.ticker} Transfer 🎉`,
      description: `Your transfer of ${tx.amount} ${tx.asset.ticker} from your trading account to your funding account has been successfully processed.`,
      type: "Success",
      href: "/history",
    };
  },
  customTransfer: (tx: {
    amount: string;
    asset: string;
  }): NotificationPayload => {
    return {
      category: "General",
      message: `${tx.amount} ${tx.asset} Transfer 🎉`,
      description: `Your transfer of ${tx.amount} ${tx.asset} from your funding account to another funding account has been successfully processed.`,
      type: "Success",
      href: "/history",
    };
  },
  newTradingAccount: (): NotificationPayload => {
    return {
      category: "General",
      message: `New Trading Account Created 🎉`,
      description: `Your new trading account have been successfully created. Transfer funds from your funding account to your trading account to start trading.`,
      type: "Success",
      href: "/transfer/PDEX",
    };
  },
  removeTradingAccount: (): NotificationPayload => {
    return {
      category: "General",
      message: `Trading account removed`,
      description: `Your trading account have been successfully removed from the blockchain. Don't worry your funds are safe. You can create another trading account to start trading with them.`,
      type: "Success",
      href: "/transfer/PDEX",
    };
  },
  claimReward: ({ reward }: { reward: string }): NotificationPayload => {
    return {
      category: "General",
      message: `Reward Claimed 🎉`,
      description: `You have just claimed your reward of ${reward}. You can check your balance now.`,
      type: "Success",
      href: `/balances`,
    };
  },
};
