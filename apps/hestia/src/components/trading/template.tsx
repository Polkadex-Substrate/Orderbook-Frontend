"use client";

import { Fragment, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMarkets } from "@orderbook/core/hooks";
import {
  canonicalMarketPath,
  getCurrentMarket,
  getMarketUrl,
} from "@orderbook/core/helpers";
import { useWindowSize } from "react-use";
import classNames from "classnames";
import { Resizable, ImperativePanelHandle } from "@mitrabook/ux";

import { AssetInfo } from "./AssetInfo";
import { Orderbook } from "./Orderbook";
import { Trades } from "./Trades";
import { tradingLayout } from "./breakpoints";
import { Orders } from "./Orders";
import { PlaceOrder } from "./PlaceOrder";
import { Graph } from "./Graph";
import { ResponsiveInteraction } from "./PlaceOrder/responsiveInteraction";
import { Responsive } from "./responsive";
import { ResponsiveAssetInfo } from "./AssetInfo/responsiveAssetInfo";
import { OrderbookFillProvider } from "./orderbookFill";
import { MarketNotFound } from "./marketNotFound";

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

  const { width, height } = useWindowSize();
  const { list, loading } = useMarkets();
  const currentMarket = getCurrentMarket(list, id);

  const router = useRouter();
  const canonicalised = useRef(false);

  /**
   * Rewrite a legacy URL to the canonical one: /trading/PDEXUSDT becomes
   * /trading/PDEX-USDT.
   *
   * Which spelling a segment uses cannot be decided without the market list -
   * nothing can tell where PDEX ends and USDT begins - so this cannot happen on
   * the server and has to wait for the markets to arrive.
   *
   * THREE GUARDS, AND EACH ONE IS THERE FOR A REASON.
   *
   * `canonicalMarketPath` returns null when the URL is already canonical, and a
   * test feeds it its own output to prove that. So the second pass after this
   * navigation is a no-op by construction rather than by luck. An automatic
   * navigation in an effect is exactly what turned the error boundary into an
   * unresponsive page in August; the difference here is that the terminating
   * condition is a tested property of a pure function.
   *
   * The ref means it happens at most once per mount even if `list` changes
   * identity, and `replace` rather than `push` keeps the legacy URL out of the
   * back button, so Back does not walk the user through the redirect again.
   */
  useEffect(() => {
    if (canonicalised.current || !currentMarket) return;
    const target = canonicalMarketPath(id, currentMarket);
    if (!target) return;
    canonicalised.current = true;
    router.replace(target);
  }, [id, currentMarket, router]);

  // The four modes come from one place now, and are mutually exclusive.
  //
  // They used to be four independent comparisons, and two of them overlapped:
  // `desktopView = width >= 1280` and `tabletView = width >= 954 && width <=
  // 1280` were BOTH true at exactly 1280, so both branches rendered - mounting
  // PlaceOrder twice and applying the tablet-only 710px floor to a desktop
  // layout. 1280 CSS px is what a 1920-wide screen gives at Windows' default
  // 150% scale, so that was the common case, not an edge case. It is what hid
  // the order history. See breakpoints.ts for the full account.
  const {
    mobileView,
    tabletView,
    desktopView,
    superWideView,
    tabletStackHasRoom,
  } = useMemo(() => tradingLayout(width, height), [width, height]);

  /*
   * Not found, stated rather than hidden.
   *
   * `loading` is what separates "this pair does not exist" from "the market list
   * has not arrived yet". Without that check every visitor would see the
   * not-found screen for a moment on every load, which is worse than the bug
   * being fixed. It comes from `isReady` on the market service, so it is the
   * service's own answer rather than a guess from an empty array.
   *
   * After every hook, because a conditional return before one changes the hook
   * order between renders.
   */
  if (!loading && list?.length && !currentMarket) {
    return <MarketNotFound id={id} href={getMarketUrl()} />;
  }

  return (
    // Wraps BOTH the orderbook and the order form: the fill signal travels
    // between two sibling panels, so the provider has to sit above both.
    // Mobile renders the same subtree through <Responsive>, so it is covered.
    <OrderbookFillProvider>
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
                // Requires the VERTICAL room too. A 710px floor inside an
                // overflow-hidden parent with ~600px to give does not
                // scroll, it clips - and what got clipped was Orders.
                tabletStackHasRoom && "min-h-[710px]"
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
          <span className="text-base font-bold leading-none select-none">
            ?
          </span>
        </button>
      </div>
    </OrderbookFillProvider>
  );
}
