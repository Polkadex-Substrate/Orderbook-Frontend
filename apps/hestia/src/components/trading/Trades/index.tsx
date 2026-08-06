"use client";

import { Tabs } from "@mitrabook/ux";

import { Markets } from "./Market";
import { RecentTrades } from "./RecentTrades";

export const Trades = ({
  id,
  stacked = false,
}: {
  id: string;
  /** Ultrawide: show Markets and Recent Trades at once instead of tabs. */
  stacked?: boolean;
}) => {
  if (stacked) {
    return (
      <div
        data-tour="recent-trades"
        className="flex flex-col h-full flex-initial max-xl:flex-1"
      >
        <div className="flex-1 flex flex-col min-h-0 basis-3/5">
          <div className="border-b border-primary px-2 py-2.5 text-sm font-medium">
            Markets
          </div>
          <div className="flex-1 overflow-auto bg-level-0">
            <Markets market={id} />
          </div>
        </div>
        <div className="flex-1 flex flex-col min-h-0 basis-2/5 border-t border-primary">
          <div className="border-b border-primary px-2 py-2.5 text-sm font-medium">
            Recent Trades
          </div>
          <div className="flex-1 overflow-auto bg-level-0">
            <RecentTrades id={id} />
          </div>
        </div>
      </div>
    );
  }
  return (
    <Tabs
      data-tour="recent-trades"
      defaultValue="markets"
      className="flex-initial max-xl:flex-1 h-full"
    >
      <div className="flex-1 flex h-full flex-col">
        <div className="flex border-b border-primary">
          <Tabs.List className="px-2 py-2.5">
            <Tabs.Trigger value="markets">Markets</Tabs.Trigger>
            <Tabs.Trigger value="recentTrades">Recent Trades</Tabs.Trigger>
          </Tabs.List>
        </div>
        <Tabs.Content value="markets" className="bg-level-0">
          <Markets market={id} />
        </Tabs.Content>
        <Tabs.Content value="recentTrades" className="bg-level-0">
          <RecentTrades id={id} />
        </Tabs.Content>
      </div>
    </Tabs>
  );
};
