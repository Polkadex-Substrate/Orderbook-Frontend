"use client";

import { Typography, Input, Tabs, Tooltip, ScrollArea } from "@polkadex/ux";
import { useMemo, useRef, useState } from "react";
import { RiInformation2Line } from "@remixicon/react";
import { useResizeObserver, useWindowSize } from "usehooks-ts";
import { useProfile } from "@orderbook/core/providers/user/profile";
import classNames from "classnames";
import { useRouter, useSearchParams } from "next/navigation";
import { useConnectWalletProvider } from "@orderbook/core/providers/user/connectWalletProvider";

import { ResponsiveProfile } from "../ui/Header/Profile/responsiveProfile";

import { Help } from "./Help";
import { TransferHistory } from "./Transfer";
import { OpenOrders } from "./OpenOrders";
import { OrderHistory } from "./OrderHistory";
import { TradeHistory } from "./TradeHistory";
import { TheaHistory } from "./TheaHistory";

import { Footer, Header } from "@/components/ui";
import { ConnectAccountWrapper } from "@/components/ui/ReadyToUse";
import { useSizeObserver } from "@/hooks";

export function Template() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { width } = useWindowSize();

  const headerRef = useRef<HTMLDivElement | null>(null);
  const helpRef = useRef<HTMLDivElement | null>(null);
  const overviewRef = useRef<HTMLDivElement | null>(null);
  const tableRowsRef = useRef<HTMLDivElement | null>(null);
  const [footerRef, footerHeight] = useSizeObserver();
  const [interactionRef, interactionHeight] = useSizeObserver();

  const { height: overviewHeight = 0 } = useResizeObserver({
    ref: overviewRef,
    box: "border-box",
  });

  const { height: helpHeight = 0 } = useResizeObserver({
    ref: helpRef,
    box: "border-box",
  });

  const { height: headerHeight = 0 } = useResizeObserver({
    ref: headerRef,
    box: "border-box",
  });

  const { height: tableRowsHeight = 0 } = useResizeObserver({
    ref: tableRowsRef,
    box: "border-box",
  });

  const [searchTerm, setSearchTerm] = useState("");

  const responsiveView = useMemo(() => width <= 675, [width]);
  const scrollAreaView = useMemo(() => width <= 470, [width]);

  const maxHeight = useMemo(
    () =>
      `calc(100vh - ${
        overviewHeight +
        headerHeight +
        helpHeight +
        tableRowsHeight +
        footerHeight +
        50
      }px)`,
    [headerHeight, overviewHeight, helpHeight, tableRowsHeight, footerHeight]
  );
  const {
    selectedAddresses: { mainAddress },
  } = useProfile();
  const mobileView = useMemo(() => width <= 640, [width]);
  const { browserAccountPresent, extensionAccountPresent } =
    useConnectWalletProvider();

  return (
    <div
      className="flex flex-1 flex-col bg-backgroundBase h-full"
      vaul-drawer-wrapper=""
    >
      <Tabs
        defaultValue={searchParams.get("tab") || "transfer"}
        onValueChange={(e) => router.replace(`/history/?tab=${e}`)}
      >
        <Header ref={headerRef} />
        <main
          className="flex flex-1 overflow-auto border-x border-secondary-base w-full max-w-[1920px] m-auto"
          style={{
            paddingBottom: mobileView
              ? `${interactionHeight}px`
              : `${footerHeight}px`,
          }}
        >
          <div className="flex-1 flex flex-col">
            <div ref={overviewRef} className="flex flex-col">
              <div className="flex items-center justify-between gap-4 px-4 pt-6 pb-4  border-b border-secondary-base flex-wrap">
                <Typography.Text bold size="lg">
                  Transactions
                </Typography.Text>
                <Tooltip>
                  <Tooltip.Trigger>
                    <RiInformation2Line className="w-6 h-6 text-primary" />
                  </Tooltip.Trigger>
                  <Tooltip.Content className="w-52" side="left">
                    <Typography.Text className="text-primary">
                      Explore detailed records of your Transfers & Orders here.
                    </Typography.Text>
                  </Tooltip.Content>
                </Tooltip>
              </div>
              <div
                className={classNames(
                  "flex items-center justify-between gap-2 border-b border-primary px-4 w-full",
                  responsiveView && "flex-col"
                )}
              >
                <ScrollArea className={`${scrollAreaView && "max-w-80"}`}>
                  <Tabs.List className="py-2 whitespace-nowrap">
                    <Tabs.Trigger value="transfer">Transfer</Tabs.Trigger>
                    <Tabs.Trigger value="openOrders">Open Orders</Tabs.Trigger>
                    <Tabs.Trigger value="orderHistory">
                      Order History
                    </Tabs.Trigger>
                    <Tabs.Trigger value="tradeHistory">
                      Trade History
                    </Tabs.Trigger>
                    <Tabs.Trigger value="crossChain">Cross Chain</Tabs.Trigger>
                  </Tabs.List>
                  <ScrollArea.Bar orientation="horizontal" />
                </ScrollArea>
                <div>
                  <Input.Search
                    className="py-2 max-sm:focus:text-[16px]"
                    placeholder="Search transactions.."
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <Tabs.Content value="transfer" className="flex-1 flex">
              {mainAddress?.length ? (
                <TransferHistory
                  ref={tableRowsRef}
                  maxHeight={maxHeight}
                  searchTerm={searchTerm}
                />
              ) : (
                <ConnectAccountWrapper funding />
              )}
            </Tabs.Content>
            <Tabs.Content value="openOrders" className="flex-1 flex">
              {mainAddress?.length ? (
                <OpenOrders
                  ref={tableRowsRef}
                  maxHeight={maxHeight}
                  searchTerm={searchTerm}
                />
              ) : (
                <ConnectAccountWrapper funding />
              )}
            </Tabs.Content>
            <Tabs.Content value="orderHistory" className="flex-1 flex">
              {mainAddress?.length ? (
                <OrderHistory
                  ref={tableRowsRef}
                  maxHeight={maxHeight}
                  searchTerm={searchTerm}
                />
              ) : (
                <ConnectAccountWrapper funding />
              )}
            </Tabs.Content>
            <Tabs.Content value="tradeHistory" className="flex-1 flex">
              {mainAddress?.length ? (
                <TradeHistory
                  ref={tableRowsRef}
                  maxHeight={maxHeight}
                  searchTerm={searchTerm}
                />
              ) : (
                <ConnectAccountWrapper funding />
              )}
            </Tabs.Content>
            <Tabs.Content value="crossChain" className="flex-1 flex">
              {mainAddress?.length ? (
                <TheaHistory
                  ref={tableRowsRef}
                  maxHeight={maxHeight}
                  searchTerm={searchTerm}
                />
              ) : (
                <ConnectAccountWrapper funding />
              )}
            </Tabs.Content>
            <Help ref={helpRef} />
          </div>
        </main>
        {mobileView && (browserAccountPresent || extensionAccountPresent) && (
          <div
            ref={interactionRef}
            className="flex flex-col gap-4 py-2 bg-level-1 border-t border-primary px-2 fixed bottom-0 left-0 w-full"
          >
            <ResponsiveProfile
              extensionAccountPresent={extensionAccountPresent}
              browserAccountPresent={browserAccountPresent}
            />
          </div>
        )}
        {!mobileView && <Footer marketsActive ref={footerRef} />}
      </Tabs>
    </div>
  );
}
