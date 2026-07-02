"use client";

import { Button, Typography, Tabs } from "@polkadex/ux";
import { useResizeObserver } from "usehooks-ts";
import { useMemo, useRef, useState } from "react";
import { RiExternalLinkLine } from "@remixicon/react";
import { useWindowSize } from "react-use";
import { useConnectWalletProvider } from "@orderbook/core/providers/user/connectWalletProvider";
import { useMarkets } from "@orderbook/core/hooks";
import { useProfile } from "@orderbook/core/providers/user/profile";
import { getCurrentMarket } from "@orderbook/core/helpers";

import { Rewards } from "../ui/Icons/rewards";
import { ResponsiveProfile } from "../ui/Header/Profile/responsiveProfile";
import { Footer, Header } from "@/components/ui";

import { Overview } from "./Overview";
import { TableRewards } from "./TableRewards";

import { EpochOverviewPanel } from "@/components/lmp/EpochOverviewPanel";
import { QScoreGauges } from "@/components/lmp/QScoreGauges";
import { MarketTierSelector } from "@/components/lmp/MarketTierSelector";
import { LMPLeaderboard } from "@/components/lmp/LMPLeaderboard";
import { DMMPanel } from "@/components/lmp/DMMPanel";
import { LMPHistoryTab } from "@/components/lmp/LMPHistoryTab";
import { MarketTier } from "@orderbook/core/hooks";

export function Template({ id }: { id: string }) {
  const { width } = useWindowSize();
  const { list } = useMarkets();
  const currentMarket = getCurrentMarket(list, id);
  const {
    selectedAddresses: { mainAddress },
  } = useProfile();

  // Tier + pair selection state (lifted here so panels share it)
  const [selectedTier, setSelectedTier] = useState<MarketTier | "All">("All");
  const [selectedPair, setSelectedPair] = useState<string>(id ?? "");

  // Active epoch — derive from the current market id for now
  const activeEpoch = 42; // TODO: replace with useEpochs() current epoch

  const [rewardsTab, setRewardsTab] = useState("myRewards");

  const footerRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const overviewRef = useRef<HTMLDivElement | null>(null);
  const tableTitlesRef = useRef<HTMLDivElement | null>(null);
  const tableRowsRef = useRef<HTMLDivElement | null>(null);
  const interactionRef = useRef<HTMLDivElement | null>(null);

  const { height: overviewHeight = 0 } = useResizeObserver({ ref: overviewRef, box: "border-box" });
  const { height: tableTitleHeight = 0 } = useResizeObserver({ ref: tableTitlesRef, box: "border-box" });
  const { height: headerHeight = 0 } = useResizeObserver({ ref: headerRef, box: "border-box" });
  const { height: footerHeight = 0 } = useResizeObserver({ ref: footerRef, box: "border-box" });
  const { height: interactionHeight = 0 } = useResizeObserver({ ref: interactionRef, box: "border-box" });
  const { height: tableRowsHeight = 0 } = useResizeObserver({ ref: tableRowsRef, box: "border-box" });

  const maxHeight = useMemo(
    () => `calc(100vh - ${overviewHeight + headerHeight + tableTitleHeight + tableRowsHeight + 25}px)`,
    [headerHeight, overviewHeight, tableTitleHeight, tableRowsHeight]
  );

  const mobileView = useMemo(() => width <= 640, [width]);
  const { browserAccountPresent, extensionAccountPresent } = useConnectWalletProvider();

  return (
    <div className="flex flex-1 flex-col bg-backgroundBase" vaul-drawer-wrapper="">
      <Header ref={headerRef} />
      <main
        className="flex flex-1 overflow-auto border-x border-secondary-base w-full max-w-[1920px] m-auto"
        style={{
          paddingBottom: mobileView ? `${interactionHeight}px` : `${footerHeight}px`,
        }}
      >
        <div className="flex-1 flex flex-col">
          {/* ── Original market overview (back link + volume stats) ── */}
          <Overview ref={overviewRef} market={currentMarket} />

          {/* ── New: epoch overview panel ── */}
          <EpochOverviewPanel market={currentMarket?.id ?? ""} />

          {/* ── New: Q-score gauges (current user) ── */}
          <QScoreGauges address={mainAddress || undefined} />

          {/* ── New: market tier selector ── */}
          <MarketTierSelector
            selectedTier={selectedTier}
            onTierChange={setSelectedTier}
            selectedPair={selectedPair}
            onPairSelect={setSelectedPair}
          />

          {/* ── New: DMM assignments (collapsible) ── */}
          <DMMPanel />

          {/* ── Main split: rewards/history left · leaderboard right ── */}
          <div className="flex flex-1 max-lg:flex-col">
            {/* Left panel — my rewards + LMP history tabs */}
            <div className="flex-1 basis-2/3 flex flex-col border-b border-secondary-base">
              <Tabs value={rewardsTab} onValueChange={setRewardsTab}>
                <div
                  ref={tableTitlesRef}
                  className="flex items-center border-b border-primary"
                >
                  <Tabs.List className="w-full">
                    <Tabs.Trigger value="myRewards" className="px-4 py-3">
                      My Trading Rewards
                    </Tabs.Trigger>
                    <Tabs.Trigger value="lmpHistory" className="px-4 py-3">
                      LMP History
                    </Tabs.Trigger>
                  </Tabs.List>
                </div>

                <Tabs.Content value="myRewards">
                  <TableRewards
                    ref={tableRowsRef}
                    maxHeight={maxHeight}
                    market={currentMarket?.id as string}
                  />
                </Tabs.Content>

                <Tabs.Content value="lmpHistory">
                  <LMPHistoryTab address={mainAddress || undefined} />
                </Tabs.Content>
              </Tabs>
            </div>

            {/* Right panel — LMP leaderboard */}
            <div className="basis-1/3 max-lg:w-full flex flex-col border-l border-primary">
              <LMPLeaderboard
                epoch={activeEpoch}
                pair={selectedPair || currentMarket?.id || ""}
                maxHeight={maxHeight}
                currentUserAddress={mainAddress || undefined}
                volatilityActive={false}
              />

              {/* Rewards program link */}
              <div className="flex items-center justify-between px-5 py-8 min-w-[20rem] h-fit gap-10 border-t border-secondary-base">
                <div className="flex items-center gap-2">
                  <Rewards className="w-[5rem]" />
                  <div className="flex flex-col gap-2 max-w-[25rem]">
                    <div className="flex flex-col">
                      <Typography.Paragraph size="md" className="font-medium leading-normal">
                        Rewards program
                      </Typography.Paragraph>
                      <Typography.Paragraph appearance="primary" size="sm">
                        Explore Rewards Program rules
                      </Typography.Paragraph>
                    </div>
                  </div>
                </div>
                <Button.Icon variant="outline">
                  <RiExternalLinkLine className="w-full h-full" />
                </Button.Icon>
              </div>
            </div>
          </div>
        </div>
      </main>

      {mobileView && (browserAccountPresent || extensionAccountPresent) && (
        <div
          ref={interactionRef}
          className="flex flex-col gap-4 py-2 bg-level-1 border-t border-primary px-2 fixed bottom-0 left-0 w-full z-[2]"
        >
          <ResponsiveProfile
            extensionAccountPresent={extensionAccountPresent}
            browserAccountPresent={browserAccountPresent}
          />
        </div>
      )}
      <Footer ref={footerRef} />
    </div>
  );
}
