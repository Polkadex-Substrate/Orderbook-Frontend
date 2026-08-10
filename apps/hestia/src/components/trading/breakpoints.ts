/**
 * Which trading layout should render at this viewport size.
 *
 * THE BUG THIS FIXES (reported 2026-08-10)
 * "The order history section wasn't visible even on a display with 1920x1200
 * resolution. He had to zoom out to 90% to view the full render."
 *
 * 1920x1200 is not the number that matters. Windows was at 150% scale, so the
 * BROWSER sees 1920/1.5 = 1280 CSS pixels wide and 1200/1.5 = 800 tall - and
 * after the taskbar and Chrome's own toolbars, roughly 660-680 CSS pixels of
 * usable height. A generous-sounding display was really a small viewport.
 *
 * 1280 CSS pixels is then the exact width where the old breakpoints overlapped:
 *
 *     desktopView = width >= 1280        // true at 1280
 *     tabletView  = width >= 954 && width <= 1280   // ALSO true at 1280
 *
 * Both branches rendered. At exactly 1280 the page therefore:
 *   - mounted <PlaceOrder> TWICE, once in each branch
 *   - applied the tablet-only `min-h-[710px]` to the bottom panel
 *   - inside a parent that is `h-[100dvh] overflow-hidden`
 *
 * With ~660px of viewport and a header above it, the bottom panel was told to be
 * at least 710px tall in a space of roughly 600. `overflow-hidden` then CLIPPED
 * the excess instead of scrolling it, so Orders - the order history - was cut off
 * with no scrollbar and nothing on screen to suggest anything was missing.
 *
 * Zooming to 90% fixed it by accident, and the accident is the proof: it made the
 * viewport 1422 CSS pixels wide, which is past 1280, so tabletView went false,
 * the 710px minimum disappeared and the duplicate panel unmounted.
 *
 * 1280x800 CSS is what a 1920x1200 laptop at 150% scale gives you, and 150% is
 * the Windows DEFAULT at that panel size - the screenshot says "(Recommended)".
 * So this was not an edge case. It was the most common Windows laptop
 * configuration hitting the one width where two layouts fought.
 *
 * The `>= 954` / `<= 954` pair had the same overlap at 954.
 *
 * THE RULE: the four modes are mutually exclusive and cover every width, so
 * exactly one is ever true. That property is what the tests actually check -
 * asserting individual booleans would not have caught the original bug, because
 * each one was correct on its own.
 *
 * Import-free so it is testable without a renderer or a window.
 */

/** Below this, the stacked mobile layout. */
export const MOBILE_MAX = 954;
/** At or above this, the three-column desktop layout. */
export const DESKTOP_MIN = 1280;
/** At or above this, show Markets and Recent Trades side by side. */
export const SUPER_WIDE_MIN = 2200;

/**
 * The tablet layout stacks the order form above the order history and needs the
 * vertical room to do it. Below this height it does not fit, and the parent
 * clips rather than scrolls.
 */
export const TABLET_STACK_MIN_HEIGHT = 760;

export type TradingLayout = {
  mobileView: boolean;
  tabletView: boolean;
  desktopView: boolean;
  superWideView: boolean;
  /**
   * Whether the tablet bottom panel may claim its 710px minimum.
   *
   * Separate from `tabletView` because the minimum is only safe when the
   * viewport can actually supply it. A tablet-width window on a short screen
   * gets the tablet layout WITHOUT the pixel floor, so the panel shrinks and
   * scrolls internally instead of being clipped.
   */
  tabletStackHasRoom: boolean;
};

export const tradingLayout = (
  width: number,
  height = Infinity
): TradingLayout => {
  // A width of 0 is what useWindowSize reports before the first measurement.
  // Treating it as mobile keeps the first paint to the simplest layout rather
  // than mounting the desktop panel group and immediately tearing it down.
  const w = Number.isFinite(width) && width > 0 ? width : 0;

  const mobileView = w < MOBILE_MAX;
  const desktopView = w >= DESKTOP_MIN;
  // Strictly between the two, so no width is ever both.
  const tabletView = w >= MOBILE_MAX && w < DESKTOP_MIN;

  return {
    mobileView,
    tabletView,
    desktopView,
    // Deliberately NOT independent of desktopView: super-wide is a refinement of
    // desktop, and both are meant to be true together.
    superWideView: w >= SUPER_WIDE_MIN,
    tabletStackHasRoom: tabletView && height >= TABLET_STACK_MIN_HEIGHT,
  };
};
