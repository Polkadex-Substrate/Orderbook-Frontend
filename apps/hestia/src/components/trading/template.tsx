"use client";

import { Fragment, useMemo, useRef } from "react";
import { useMarkets } from "@orderbook/core/hooks";
import { getCurrentMarket } from "@orderbook/core/helpers";
import { useWindowSize } from "react-use";
import classNames from "classnames";
import { Resizable, ImperativePanelHandle } from "@polkadex/ux";

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
  const [footerRef, footerHeight] = useSizeObserver();
  const [interactionRef, interactionHeight] = useSizeObserver();
  const { startTour } = useTour();

  const mainPanelRef = useRef<ImperativePanelHandle>(null);
  const orderbookPanelRef = useRef<ImperativePanelHandle>(null);

  const { width } = useWindowSize();
  const { list } = useMarkets();
  const currentMarket = getCurrentMarket(list, id);

  const mobileView = useMemo(() => width <= 954, [width]);
  const desktopView = useMemo(() => width >= 1280, [width]);
  const tabletView = useMemo(() => width >= 954 && width <= 1280, [width]);

  return (
    <Fragment>
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
          className="flex-1 h-full"
          autoSaveId="persistence"
          vaul-drawer-wrapper=""
          style={{
            paddingBottom: `${footerHeight}px`,
          }}
        >
          <Resizable.Panel
            ref={mainPanelRef}
            defaultSize={80}
            minSize={50}
            className="flex min-h-[400px]"
          >
            <Resizable
              direction="horizontal"
              autoSaveId="persistence"
              className="!h-auto"
            >
              <Resizable.Panel minSize={40}>
                <div className="flex flex-col flex-grow h-full w-full">
                  <AssetInfo currentMarket={currentMarket} />
                  {/* @ts-ignore */}
                  <Graph id={id} currentMarket={currentMarket} />
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
                    <Trades id={id} />
                  </Resizable.Panel>
                </Fragment>
              )}
            </Resizable>
          </Resizable.Panel>
          <Resizable.Handle />
          <Resizable.Panel
            className={classNames(
              tabletView && "min-h-[710px]",
              desktopView && "min-h-[300px]"
            )}
          >
            <Resizable
              direction={desktopView ? "horizontal" : "vertical"}
              autoSaveId="persistence"
              className={classNames(!desktopView && "min-h-webKit")}
            >
              {tabletView && (
                <Resizable
                  direction="horizontal"
                  autoSaveId="persistence"
                  className="max-h-[320px] border-b border-primary !h-webKit"
                >
                  <Resizable.Panel
                    className="min-h-[310px] min-w-[615px]"
                    collapsible
                    collapsedSize={0}
                    defaultValue={60}
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
                minSize={58}
                className={classNames(
                  !desktopView && "flex flex-col max-h-[400px]"
                )}
              >
                <Orders />
              </Resizable.Panel>
              {desktopView && (
                <Fragment>
                  <Resizable.Handle />
                  <Resizable.Panel
                    className="min-h-[310px]"
                    collapsible
                    collapsedSize={0}
                    defaultValue={38}
                    minSize={38}
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
        <Footer marketsActive ref={footerRef} />
      )}
      <button
        onClick={startTour}
        title="Take a tour"
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-10 h-10 rounded-full bg-[#E6007A] text-white shadow-lg hover:bg-[#c8006a] transition-colors duration-200 focus:outline-none"
        aria-label="Start product tour"
      >
        <span className="text-base font-bold leading-none select-none">?</span>
      </button>
    </Fragment>
  );
}
