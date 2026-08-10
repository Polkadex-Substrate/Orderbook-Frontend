import {
  DESKTOP_MIN,
  MOBILE_MAX,
  SUPER_WIDE_MIN,
  TABLET_STACK_MIN_HEIGHT,
  tradingLayout,
} from "./breakpoints";

/*
 * Jest globals, matching the rest of this app.
 *
 * THE TEST THAT MATTERS is "exactly one layout at every width". The original bug
 * was not a wrong boolean - each of desktopView and tabletView was defensible on
 * its own. It was two booleans being true at once. So the invariant, not the
 * individual values, is what has to be pinned.
 */

const LAYOUT_KEYS = ["mobileView", "tabletView", "desktopView"] as const;

const activeLayouts = (width: number) => {
  const layout = tradingLayout(width, 1000);
  return LAYOUT_KEYS.filter((k) => layout[k]);
};

describe("the reported bug: 1920x1200 at 150% scale", () => {
  // 1920/1.5 = 1280 wide, 1200/1.5 = 800 tall, and after the Windows taskbar
  // and Chrome's toolbars roughly 660 usable.
  const WIDTH = 1280;
  const USABLE_HEIGHT = 660;

  it("is desktop and ONLY desktop at 1280", () => {
    expect(activeLayouts(WIDTH)).toEqual(["desktopView"]);
  });

  it("does not also claim to be tablet at 1280, which is what broke it", () => {
    // The old code: tabletView = width >= 954 && width <= 1280. Both true here,
    // so both branches rendered and PlaceOrder mounted twice.
    expect(tradingLayout(WIDTH, USABLE_HEIGHT).tabletView).toBe(false);
  });

  it("does not grant the 710px tablet floor at 1280", () => {
    // This is the clip: a 710px minimum inside an overflow-hidden parent with
    // about 600px to give.
    expect(tradingLayout(WIDTH, USABLE_HEIGHT).tabletStackHasRoom).toBe(false);
  });

  it("explains the 90% zoom workaround", () => {
    // Zooming out to 90% widens the viewport to 1280/0.9 = 1422 CSS px, which is
    // past DESKTOP_MIN - so the overlap disappeared and it looked fixed.
    const zoomed = Math.round(WIDTH / 0.9);
    expect(zoomed).toBeGreaterThan(DESKTOP_MIN);
    expect(activeLayouts(zoomed)).toEqual(["desktopView"]);
  });
});

describe("exactly one layout is active, at every width", () => {
  it("holds across a full sweep", () => {
    for (let w = 1; w <= 3000; w += 1) {
      const active = activeLayouts(w);
      if (active.length !== 1) {
        throw new Error(
          `width ${w} matched ${active.length} layouts: ${active.join(", ")}`
        );
      }
    }
  });

  it("holds at both boundaries and either side of them", () => {
    // Both old overlaps were exactly on a boundary, which is why a sweep at
    // coarse steps could have missed them.
    for (const w of [
      MOBILE_MAX - 1,
      MOBILE_MAX,
      MOBILE_MAX + 1,
      DESKTOP_MIN - 1,
      DESKTOP_MIN,
      DESKTOP_MIN + 1,
      SUPER_WIDE_MIN - 1,
      SUPER_WIDE_MIN,
      SUPER_WIDE_MIN + 1,
    ]) {
      expect({ width: w, active: activeLayouts(w) }).toEqual({
        width: w,
        active: activeLayouts(w),
      });
      expect(activeLayouts(w)).toHaveLength(1);
    }
  });

  it("assigns each boundary to the layout above it", () => {
    expect(activeLayouts(MOBILE_MAX - 1)).toEqual(["mobileView"]);
    expect(activeLayouts(MOBILE_MAX)).toEqual(["tabletView"]);
    expect(activeLayouts(DESKTOP_MIN - 1)).toEqual(["tabletView"]);
    expect(activeLayouts(DESKTOP_MIN)).toEqual(["desktopView"]);
  });
});

describe("superWideView refines desktop rather than replacing it", () => {
  it("is true together with desktopView", () => {
    const layout = tradingLayout(SUPER_WIDE_MIN, 1400);
    expect({
      desktop: layout.desktopView,
      superWide: layout.superWideView,
    }).toEqual({ desktop: true, superWide: true });
  });

  it("is false below the threshold while desktop stays true", () => {
    const layout = tradingLayout(SUPER_WIDE_MIN - 1, 1400);
    expect({
      desktop: layout.desktopView,
      superWide: layout.superWideView,
    }).toEqual({ desktop: true, superWide: false });
  });

  it("is never true outside desktop", () => {
    for (let w = 1; w < DESKTOP_MIN; w += 7) {
      expect({ w, sw: tradingLayout(w, 1400).superWideView }).toEqual({
        w,
        sw: false,
      });
    }
  });
});

describe("tabletStackHasRoom", () => {
  const TABLET_WIDTH = 1000;

  it("is granted on a tablet width with enough height", () => {
    expect(
      tradingLayout(TABLET_WIDTH, TABLET_STACK_MIN_HEIGHT).tabletStackHasRoom
    ).toBe(true);
  });

  it("is withheld one pixel below the required height", () => {
    // The whole point: a tablet-width window on a short screen keeps the tablet
    // layout but loses the pixel floor, so it shrinks instead of being clipped.
    expect(
      tradingLayout(TABLET_WIDTH, TABLET_STACK_MIN_HEIGHT - 1)
        .tabletStackHasRoom
    ).toBe(false);
  });

  it("is never granted outside the tablet width range", () => {
    for (const w of [500, 953, DESKTOP_MIN, 1920, 2400]) {
      expect({ w, room: tradingLayout(w, 2000).tabletStackHasRoom }).toEqual({
        w,
        room: false,
      });
    }
  });

  it("defaults to granted when no height is supplied", () => {
    // Callers that do not measure height should behave as the code did before,
    // rather than silently losing the tablet minimum.
    expect(tradingLayout(TABLET_WIDTH).tabletStackHasRoom).toBe(true);
  });
});

describe("the pre-measurement state", () => {
  it("treats width 0 as mobile", () => {
    // useWindowSize reports 0 before the first measurement. Mobile is the
    // cheapest first paint and avoids mounting the desktop panel group only to
    // tear it down a frame later.
    expect(activeLayouts(0)).toEqual(["mobileView"]);
  });

  it("treats a non-finite or negative width as mobile", () => {
    for (const w of [NaN, Infinity, -1, -1000]) {
      expect({ w: String(w), active: activeLayouts(w) }).toEqual({
        w: String(w),
        active: ["mobileView"],
      });
    }
  });
});
