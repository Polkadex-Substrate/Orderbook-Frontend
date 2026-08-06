"use client";

import { Typography, Tabs, Carousel, HoverCard, Skeleton } from "@polkadex/ux";
import { useResizeObserver, useWindowSize } from "usehooks-ts";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiInformation2Line,
} from "@remixicon/react";
import { useConnectWalletProvider } from "@orderbook/core/providers/user/connectWalletProvider";
import { useEpochs } from "@orderbook/core/hooks";
import classNames from "classnames";
import { START_EPOCH } from "@orderbook/core/constants";

import { ResponsiveProfile } from "../ui/Header/Profile/responsiveProfile";

import { Table } from "./Table";
import { Help } from "./Help";
import { Info } from "./info";

import { Footer, Header } from "@/components/ui";
import { useSizeObserver } from "@/hooks";

export function Template() {
  const [tab, setTab] = useState("0");
  const { width } = useWindowSize();
  const { epochs, isLoading } = useEpochs();

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

  const maxHeight = useMemo(
    () =>
      `calc(100vh - ${
        overviewHeight +
        headerHeight +
        footerHeight +
        helpHeight +
        tableRowsHeight +
        1
      }px)`,
    [headerHeight, footerHeight, overviewHeight, helpHeight, tableRowsHeight]
  );
  const mobileView = useMemo(() => width <= 640, [width]);
  const { browserAccountPresent, extensionAccountPresent } =
    useConnectWalletProvider();

  useEffect(() => {
    const epochsLength = epochs?.length || 0;
    if (epochs && epochs?.length > 2) {
      setTab(epochs[epochsLength - 2].epoch.toString());
    } else setTab(String(START_EPOCH));
  }, [epochs]);

  return (
    <div
      className="flex flex-1 flex-col bg-backgroundBase h-full"
      vaul-drawer-wrapper=""
    >
      <Header ref={headerRef} />
      <main
        className="flex flex-1 overflow-hidden border-x border-secondary-base w-full max-w-[1920px] m-auto"
        style={{
          paddingBottom: mobileView
            ? `${interactionHeight}px`
            : `${footerHeight}px`,
        }}
      >
        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex-1 flex flex-col">
            <div ref={overviewRef} className="flex flex-col">
              <div className="flex items-end justify-between gap-4 px-4 pt-6 pb-4 border-b border-secondary-base flex-wrap">
                <Typography.Text bold size="lg">
                  Rewards
                </Typography.Text>
                <RiInformation2Line className="w-6 h-6 text-primary" />
              </div>
              <div className="flex max-md:flex-col md:items-center border-b border-primary w-full">
                <HoverCard>
                  <HoverCard.Trigger className="cursor-pointer h-full transition-colors duration-300 hover:bg-level-0">
                    <div className="flex items-center gap-2 px-4 py-2 h-full">
                      <RiInformation2Line className="w-3 h-3 text-primary" />
                      <Typography.Paragraph className="whitespace-nowrap">
                        Period (Epoch)
                      </Typography.Paragraph>
                    </div>
                  </HoverCard.Trigger>
                  <HoverCard.Content>
                    <Info />
                  </HoverCard.Content>
                </HoverCard>
                <Tabs.List className="w-full max-md:border-t border-primary">
                  {isLoading ? (
                    <Skeleton loading className="h-20 max-w-[500px]" />
                  ) : (
                    <Carousel
                      options={{ align: "start", startIndex: 10 }}
                      className={classNames(
                        "mx-8 w-full",
                        epochs?.length && epochs?.length >= 3
                          ? "md:max-w-[500px]"
                          : "md:max-w-[300px]"
                      )}
                    >
                      <Carousel.Content className="gap-2">
                        {epochs?.map((value, index) => {
                          const active = value.epoch.toString() === tab;
                          const isLast = index === epochs?.length - 1;
                          return (
                            <Carousel.Item
                              key={value.epoch}
                              className={classNames(
                                "max-md:px-3 max-md:py-4 md:p-5 basis-1/2 max-md:!w-2 w-10",
                                epochs.length >= 3 && "md:basis-1/3",
                                isLast && "pointer-events-none"
                              )}
                            >
                              <Tabs.Trigger
                                value={value.epoch.toString()}
                                key={value.epoch}
                              >
                                <HoverCard
                                  defaultOpen={value.status === "Ongoing"}
                                >
                                  <HoverCard.Trigger>
                                    <div className="flex flex-col items-start">
                                      <Typography.Text
                                        bold
                                        appearance={
                                          active ? "primary-base" : "primary"
                                        }
                                      >
                                        {value.status === "Ongoing" && "*"}
                                        Epoch {value.epoch}
                                      </Typography.Text>
                                      <Typography.Text appearance="secondary">
                                        {value.status === "Ongoing" &&
                                          "Current Period"}
                                        {value.status === "Upcoming" &&
                                          "Next Period"}
                                        {value.status === "Ended" &&
                                          "Previous Period"}
                                      </Typography.Text>
                                    </div>
                                  </HoverCard.Trigger>
                                  <HoverCard.Content side="top">
                                    {value.status}
                                  </HoverCard.Content>
                                </HoverCard>
                              </Tabs.Trigger>
                            </Carousel.Item>
                          );
                        })}
                      </Carousel.Content>
                      <Carousel.Previous
                        className="h-full w-8 -left-8 border-x border-primary"
                        variant="light"
                        appearance="secondary"
                      >
                        <RiArrowLeftSLine className="w-full h-full" />
                      </Carousel.Previous>
                      <Carousel.Next
                        className="h-full w-8 -right-8 border-x border-primary"
                        variant="light"
                        appearance="secondary"
                      >
                        <RiArrowRightSLine className="w-full h-full" />
                      </Carousel.Next>
                    </Carousel>
                  )}
                </Tabs.List>
              </div>
            </div>
            <div className="flex flex-col flex-1">
              <Table
                ref={tableRowsRef}
                maxHeight={maxHeight}
                selectedEpoch={+tab}
              />
            </div>
            <Help ref={helpRef} />
          </div>
        </Tabs>
      </main>
      {mobileView ? (
        (browserAccountPresent || extensionAccountPresent) && (
          <Fragment>
            <div
              ref={interactionRef}
              className="flex flex-col gap-4 py-2 bg-level-1 border-t border-primary px-2 fixed bottom-0 left-0 w-full"
            >
              <ResponsiveProfile
                extensionAccountPresent={extensionAccountPresent}
                browserAccountPresent={browserAccountPresent}
              />
            </div>
          </Fragment>
        )
      ) : (
        <Footer ref={footerRef} />
      )}
    </div>
  );
}
