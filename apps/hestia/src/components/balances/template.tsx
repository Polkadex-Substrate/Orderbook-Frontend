"use client";

import { HoverCard, Popover, Typography, Checkbox, Input } from "@polkadex/ux";
import { useResizeObserver, useWindowSize } from "usehooks-ts";
import { useMemo, useRef } from "react";
import { RiMore2Line, RiInformation2Line } from "@remixicon/react";
import { useAssets } from "@orderbook/core/hooks";
import { useConnectWalletProvider } from "@orderbook/core/providers/user/connectWalletProvider";

import { ResponsiveProfile } from "../ui/Header/Profile/responsiveProfile";

import { Overview } from "./Overview";
import { Table } from "./Table";
import { Help } from "./Help";

import { Footer, Header } from "@/components/ui";
import { useSizeObserver } from "@/hooks";

export function Template() {
  const headerRef = useRef<HTMLDivElement | null>(null);
  const helpRef = useRef<HTMLDivElement | null>(null);
  const overviewRef = useRef<HTMLDivElement | null>(null);
  const [footerRef, footerHeight] = useSizeObserver();
  const [interactionRef, interactionHeight] = useSizeObserver();
  const { width } = useWindowSize();

  const { height: overviewHeight = 0 } = useResizeObserver({
    ref: overviewRef,
    box: "border-box",
  });

  const { height: helpheight = 0 } = useResizeObserver({
    ref: helpRef,
    box: "border-box",
  });

  const { height: headerHeight = 0 } = useResizeObserver({
    ref: headerRef,
    box: "border-box",
  });

  const { assets, filters, loading, onHideZeroBalance, onSearchToken } =
    useAssets();
  const { browserAccountPresent, extensionAccountPresent } =
    useConnectWalletProvider();

  const mobileView = useMemo(() => width <= 640, [width]);
  const maxHeight = useMemo(
    () => `calc(100vh - ${overviewHeight + headerHeight + helpheight}px)`,
    [headerHeight, overviewHeight, helpheight]
  );

  return (
    <div
      className="flex flex-1 flex-col bg-backgroundBase h-full"
      vaul-drawer-wrapper=""
    >
      <Header ref={headerRef} />
      <main
        className="flex flex-1 overflow-auto border-x border-secondary-base w-full max-w-[1920px] h-full m-auto"
        style={{
          paddingBottom: mobileView
            ? `${interactionHeight}px`
            : `${footerHeight}px`,
        }}
      >
        <div className="flex-1 flex flex-col">
          <div ref={overviewRef} className="flex flex-col">
            <div className="flex items-center justify-between px-4 pt-6 pb-4 border-b border-secondary-base">
              <Typography.Text bold size="lg">
                Balances
              </Typography.Text>
              <RiInformation2Line className="w-6 h-6 text-primary" />
            </div>
            <Overview />
            <div className="py-2 flex items-center justify-between gap-2 border-b border-primary px-4">
              <Input.Search
                placeholder="Search.."
                value={filters.search}
                onChange={onSearchToken}
                className="max-sm:focus:text-[16px]"
              />
              {width >= 680 ? (
                <div className="flex items-center gap-4">
                  <HoverCard open={false}>
                    <HoverCard.Trigger>
                      <Typography.Text appearance="disabled">
                        Convert small balance to PDEX
                      </Typography.Text>
                    </HoverCard.Trigger>
                    <HoverCard.Content className="max-w-[15rem]">
                      After each trade, you might have a bit of residual balance
                      in your account wallet. Polkadex allows you to convert
                      dust valued under 0.000012 BTC into PDEX.
                    </HoverCard.Content>
                  </HoverCard>
                  <Checkbox.Solid
                    id="hideZeroBalances"
                    checked={filters.hideZero}
                    onCheckedChange={onHideZeroBalance}
                  >
                    <Checkbox.Label htmlFor="hideZeroBalances">
                      Hide 0 balances
                    </Checkbox.Label>
                  </Checkbox.Solid>
                </div>
              ) : (
                <Popover>
                  <Popover.Trigger className="group">
                    <RiMore2Line className="w-6 h-6 text-primary group-hover:text-current transition-colors duration-300" />
                  </Popover.Trigger>
                  <Popover.Content className="flex flex-col gap-5 p-4">
                    <Typography.Text appearance="secondary" size="xs">
                      Filters
                    </Typography.Text>
                    <div className="flex flex-col gap-2">
                      <Checkbox.Solid
                        id="hideZeroBalances"
                        checked={filters.hideZero}
                        onCheckedChange={onHideZeroBalance}
                      >
                        <Checkbox.Label htmlFor="hideZeroBalances">
                          Hide 0 balances
                        </Checkbox.Label>
                      </Checkbox.Solid>{" "}
                      <HoverCard open={false}>
                        <HoverCard.Trigger>
                          <Typography.Text appearance="disabled">
                            Convert small balance to PDEX
                          </Typography.Text>
                        </HoverCard.Trigger>
                        <HoverCard.Content className="max-w-[15rem]">
                          After each trade, you might have a bit of residual
                          balance in your account wallet. Polkadex allows you to
                          convert dust valued under 0.000012 BTC into PDEX.
                        </HoverCard.Content>
                      </HoverCard>
                    </div>
                  </Popover.Content>
                </Popover>
              )}
            </div>
          </div>
          <Table maxHeight={maxHeight} data={assets} loading={loading} />
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
    </div>
  );
}
