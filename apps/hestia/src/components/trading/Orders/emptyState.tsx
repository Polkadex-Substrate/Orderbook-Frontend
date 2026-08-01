"use client";

import type { ComponentType, SVGProps } from "react";
import { Typography } from "@mitrabook/ux";
import {
  RiFileList2Line,
  RiHistoryLine,
  RiArrowLeftRightLine,
  RiWalletLine,
} from "@remixicon/react";

/**
 * Empty state for the Orders panel tabs.
 *
 * Every tab previously rendered the same thing - `title="No items found"` - so
 * the panel told you nothing about which of Open Orders, Order History, Trade
 * History or Balances you were looking at, or what would eventually appear
 * there. Worse, the DISCONNECTED state rendered a second "Connect Trading
 * Account" prompt while the order form already showed one, so an unconnected
 * trading screen asked the same thing twice.
 *
 * There is exactly one connect CTA now, in the order form, where placing an
 * order is the action being blocked. These tabs describe what is missing and
 * stay quiet.
 *
 * Built from Typography and a remixicon rather than the shared GenericMessage:
 * that component takes a `title` but the installed @mitrabook/ux typings do not
 * document a description slot, and these states need two lines - what the tab
 * is, and why it is empty.
 */

// Structural type rather than @remixicon/react's own: the installed package
// ships no type for its icon components, so importing one would not compile.
type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

type EmptyStateProps = {
  icon: IconComponent;
  title: string;
  description: string;
};

const EmptyState = ({ icon: Icon, title, description }: EmptyStateProps) => (
  <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center">
    <Icon className="w-8 h-8 text-secondary" />
    <Typography.Text size="sm" bold>
      {title}
    </Typography.Text>
    {/* max-w keeps the sentence to ~2 lines in the panel's short viewport
        instead of stretching across an ultrawide monitor. */}
    <Typography.Text size="xs" appearance="primary" className="max-w-[22rem]">
      {description}
    </Typography.Text>
  </div>
);

/**
 * Copy is split by tab AND by cause. "Nothing here yet" and "we cannot show you
 * this until you connect" are different situations, and collapsing them is what
 * made the old shared message useless.
 *
 * Deliberately no call to action in the disconnected copy: it names the
 * prerequisite and leaves the button to the order form.
 */
const COPY = {
  openOrders: {
    icon: RiFileList2Line,
    empty: {
      title: "No open orders",
      description:
        "Orders you place will appear here until they fill or you cancel them.",
    },
    disconnected: {
      title: "Open orders will appear here",
      description:
        "Connect a trading account to place orders and follow them from this panel.",
    },
  },
  orderHistory: {
    icon: RiHistoryLine,
    empty: {
      title: "No orders yet",
      description: "Filled and cancelled orders are listed here, newest first.",
    },
    disconnected: {
      title: "Order history will appear here",
      description:
        "Connect a trading account to see the orders you have placed.",
    },
  },
  tradeHistory: {
    icon: RiArrowLeftRightLine,
    empty: {
      title: "No trades yet",
      description:
        "Every fill against one of your orders is recorded here, including partial fills.",
    },
    disconnected: {
      title: "Trade history will appear here",
      description: "Connect a trading account to see your fills.",
    },
  },
  balances: {
    icon: RiWalletLine,
    empty: {
      title: "No assets yet",
      description:
        "Bridge tokens in, or use the Faucet to get testnet tokens, and your balances will show here.",
    },
    disconnected: {
      title: "Balances will appear here",
      description:
        "Connect a funding account to see what you hold on the exchange.",
    },
  },
} as const;

export type OrdersTab = keyof typeof COPY;

export const TabEmptyState = ({
  tab,
  reason,
}: {
  tab: OrdersTab;
  /** "disconnected" = no account yet; "empty" = connected, nothing to show. */
  reason: "empty" | "disconnected";
}) => {
  const { icon, [reason]: copy } = COPY[tab];
  return (
    <EmptyState icon={icon} title={copy.title} description={copy.description} />
  );
};
