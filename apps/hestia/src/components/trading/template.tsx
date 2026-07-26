"use client";

import { Fragment, useMemo, useRef } from "react";
import { useMarkets } from "@orderbook/core/hooks";
import { getCurrentMarket } from "@orderbook/core/helpers";
import { useWindowSize } from "react-use";
import classNames from "classnames";
import { Resizable, ImperativePanelHandle } from "@mitrabook/ux";

import { AssetInfo } from "./AssetInfo";
import { Orderbook } from "./Orderbook";
import { Trades } from "./Trades";
import { Orders } from "./Orders";
import { PlaceOrder } from "./PlaceOrder";
import { Graph } from "./Graph";
import { ResponsiveInteraction } from "./PlaceOrder/responsiveInteraction";
import { Responsive } from "./responsive";
import { ResponsiveAssetInfo } from "./AssetInfo/responsiveAssetInfo";

import { ConnectTradingInteraction } from "@/components/ui/ConnectWalletInteraction/connectTradingInteraction";
import { Footer, Header } from "@/components/ui";
import { useSizeObserver, useTour } from "@/hooks";

export function Template({ id }: { id: string }) {
  // Height no longer needed: the footer renders in normal flow on this
  // page (fixedPosition={false}), so nothing has to reserve space for it.
  const [footerRef] = useSizeObserver();
  const [interactionRef, interactionHeight] = useSizeObserver();
  const { startTour } = useTour();

  const mainPanelRef = useRef<ImperativePanelHandle>(null);
  const orderbookPanelRef = useRef<ImperativePanelHandle>(null);

  const { width } = useWindowSize();
  const { list } = useMarkets();
  const currentMarket = getCurrentMarket(list, id);

  const mobileView = useMemo(() => width <= 954, [width]);
  const desktopView = useMemo(() => width >= 1280, [width]);
  // Ultrawide/4K: show Markets and Recent Trades simultaneously instead of
  // tabs, and cap the grid so panels stop stretching into emptiness.
  const superWideView = useMemo(() => width >= 2200, [width]);
  const tabletView = useMemo(() => width >= 954 && width <= 1280, [width]);

  return (
    <div
      className={classNames(
        "flex flex-col",
        // Definite height + overflow-hidden: the panel group's height:100%
        // needs a resolvable parent, and the footer must stay in view rather
        // than being pushed below the fold.
        desktopView ? "h-[100dvh] overflow-hidden" : "min-h-screen"
      )}
    >
      <ConnectTradingInteraction />
      <Header />
      {mobileView ? (
        <div
          className="flex flex-col h-full min-h-screen"
          style={{
            paddingBottom: `${interactionHeight}px`,
          }}
        >
          <ResponsiveAssetInfo currentMarket={currentMarket} />
          <Responsive id={id} currentMarket={currentMarket} />
          <Orders />
        </div>
      ) : (
        <Resizable
          direction="vertical"
          className="flex-1 min-h-0 w-full max-w-[3440px] mx-auto"
          // Versioned autoSaveId. These layouts persist in localStorage, so a
          // returning user keeps their saved split and NEVER sees a changed
          // defaultSize. Bump the suffix whenever the defaults below change,
          // otherwise the fix ships but nobody who has used the app sees it.
          // Each group also needs its OWN id - they all shared "persistence".
          autoSaveId="trading-vertical-v2"
          vaul-drawer-wrapper=""
        >
          <Resizable.Panel
            ref={mainPanelRef}
            // 80/20 starved the order form: at 20% of a 16:9 desktop the
            // bottom panel is ~200px, less than half what the form needs once
            // the root font scales up at >=1680px wide.
            defaultSize={68}
            minSize={35}
            className="flex min-h-0"
          >
            <Resizable
              direction="horizontal"
              autoSaveId="trading-main-v2"
              className="!h-auto"
            >
              <Resizable.Panel minSize={40}>
                <div className="flex flex-col flex-grow h-full w-full">
                  <AssetInfo currentMarket={currentMarket} />
                  <Graph currentMarket={currentMarket} />
                </div>
              </Resizable.Panel>
              <Resizable.Handle />
              {(tabletView || desktopView) && (
                <Resizable.Panel
                  ref={orderbookPanelRef}
                  defaultSize={21}
                  minSize={21}
                  className="min-w-[290px]"
                >
                  <Orderbook id={id} />
                </Resizable.Panel>
              )}

              {desktopView && (
                <Fragment>
                  <Resizable.Handle />
                  <Resizable.Panel
                    defaultSize={21}
                    minSize={21}
                    collapsible
                    collapsedSize={0}
                  >
                    <Trades id={id} stacked={superWideView} />
                  </Resizable.Panel>
                </Fragment>
              )}
            </Resizable>
          </Resizable.Panel>
          <Resizable.Handle />
          <Resizable.Panel
            defaultSize={32}
            minSize={24}
            className={classNames(
              "min-h-0",
              // Tablet stacks these vertically and genuinely needs the room;
              // desktop must NOT set a pixel minimum (see note above).
              tabletView && "min-h-[710px]"
            )}
          >
            <Resizable
              direction={desktopView ? "horizontal" : "vertical"}
              autoSaveId="trading-bottom-v2"
              className={classNames(!desktopView && "min-h-webKit")}
            >
              {tabletView && (
                <Resizable
                  direction="horizontal"
                  autoSaveId="trading-tablet-v2"
                  className="max-h-[320px] border-b border-primary !h-webKit"
                >
                  <Resizable.Panel
                    className="min-h-[310px] min-w-[615px]"
                    collapsible
                    collapsedSize={0}
                    // was `defaultValue`, which react-resizable-panels ignores
                    defaultSize={60}
                    minSize={38}
                  >
                    <PlaceOrder market={currentMarket} />
                  </Resizable.Panel>
                  <Resizable.Handle />
                  <Resizable.Panel
                    defaultSize={22}
                    minSize={21}
                    collapsible
                    collapsedSize={0}
                    className="min-w-[310px]"
                  >
                    <Trades id={id} />
                  </Resizable.Panel>
                </Resizable>
              )}
              <Resizable.Panel
                defaultSize={58}
                // minSize was pinned at 58 (== defaultSize), so the order form
                // could never be widened past 42%.
                minSize={40}
                className={classNames(
                  "min-h-0",
                  !desktopView && "flex flex-col max-h-[400px]"
                )}
              >
                <Orders />
              </Resizable.Panel>
              {desktopView && (
                <Fragment>
                  <Resizable.Handle />
                  <Resizable.Panel
                    // No pixel min-height: it would make this panel taller
                    // than the group can allocate on short viewports, and the
                    // group clips rather than scrolls. PlaceOrder scrolls
                    // internally instead (min-h-0 + overflow-auto).
                    className="min-h-0"
                    collapsible
                    collapsedSize={0}
                    // was `defaultValue`, which react-resizable-panels ignores
                    defaultSize={42}
                    minSize={30}
                  >
                    <PlaceOrder market={currentMarket} />
                  </Resizable.Panel>
                </Fragment>
              )}
            </Resizable>
          </Resizable.Panel>
        </Resizable>
      )}
      {mobileView ? (
        <ResponsiveInteraction
          isResponsive={mobileView}
          ref={interactionRef}
          market={currentMarket}
        />
      ) : (
        <Footer marketsActive fixedPosition={false} ref={footerRef} />
      )}
      <button
        onClick={startTour}
        title="Take a tour"
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-10 h-10 rounded-full bg-[#E6007A] text-white shadow-lg hover:bg-[#c8006a] transition-colors duration-200 focus:outline-none"
        aria-label="Start product tour"
      >
        <span className="text-base font-bold leading-none select-none">?</span>
      </button>
    </div>
  );
}
