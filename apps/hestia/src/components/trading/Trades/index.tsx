"use client";

import { Tabs } from "@polkadex/ux";

import { Markets } from "./Market";
import { RecentTrades } from "./RecentTrades";

export const Trades = ({ id }: { id: string }) => {
  return (
    <Tabs defaultValue="markets" className="flex-initial max-xl:flex-1 h-full">
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
