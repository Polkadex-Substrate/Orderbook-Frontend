"use client";

import { Tabs } from "@polkadex/ux";

import { Graph } from "./Graph";
import { Orderbook } from "./Orderbook";
import { Markets } from "./Trades/Market";
import { RecentTrades } from "./Trades/RecentTrades";

export function Responsive({ id }: { id: string }) {
  return (
    <Tabs
      defaultValue="graph"
      className="flex-1 h-full flex min-h-[400px] max-h-[500px] border-b border-primary overflow-hidden"
    >
      <Tabs.List className="px-2 py-2.5 whitespace-nowrap border-b border-primary">
        <Tabs.Trigger value="graph">Chart</Tabs.Trigger>
        <Tabs.Trigger value="orderbook">Orderbook</Tabs.Trigger>
        <Tabs.Trigger value="markets">Markets</Tabs.Trigger>
        <Tabs.Trigger value="recentTrades">Recent trades</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="graph" className="flex-1 flex-col flex h-full">
        <Graph id={id} />
      </Tabs.Content>
      <Tabs.Content
        value="orderbook"
        className="flex-1 flex flex-col h-full overflow-hidden"
      >
        <Orderbook id={id} />
      </Tabs.Content>
      <Tabs.Content value="markets" className="flex-1 flex flex-col h-full">
        <Markets market={id} />
      </Tabs.Content>
      <Tabs.Content
        value="recentTrades"
        className="flex-1 flex-col flex h-full overflow-auto"
      >
        <RecentTrades id={id} />
      </Tabs.Content>
    </Tabs>
  );
}
