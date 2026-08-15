import {
  ASCENDING_TOKENS,
  IOS_NO_ZOOM_PX,
  TYPE_SCALE_PX,
  TypeToken,
  isLarger,
  oneStepUp,
  triggersIosZoom,
} from "./typeScale";

/*
 * Jest globals, matching the rest of this app.
 *
 * These tests exist because the defect they describe is invisible to review and
 * to the type system. `min-[1680px]:text-base` looks like it enlarges text, and
 * TypeScript has no opinion. Only arithmetic catches it, so the arithmetic is
 * written down here.
 */

describe("the scale is no longer inverted", () => {
  it("text-base is LARGER than text-sm, as every Tailwind reader assumes", () => {
    // themeConfig used to override base to 0.80rem while leaving sm at
    // 0.875rem. That override is gone. This assertion is the regression guard:
    // reintroducing it makes this fail rather than quietly shrinking the nav.
    expect(TYPE_SCALE_PX.base).toBeGreaterThan(TYPE_SCALE_PX.sm);
    expect(isLarger("base", "sm")).toBe(true);
  });

  it("base is the 16px a reader assumes, which also matches the design system", () => {
    // `@aksumite/ui` ships a prebuilt `.text-base{font-size:1rem}`. While the
    // override existed, the same class rendered at two different sizes in one
    // page depending on stylesheet order.
    expect(TYPE_SCALE_PX.base).toBe(16);
  });
});

describe("the ordering itself", () => {
  it("ascends strictly, with no two tokens the same size", () => {
    // A duplicate would make "one step up" a no-op and reintroduce the bug in a
    // quieter form.
    for (let i = 1; i < ASCENDING_TOKENS.length; i++) {
      const prev = ASCENDING_TOKENS[i - 1];
      const cur = ASCENDING_TOKENS[i];
      expect({
        pair: `${prev} -> ${cur}`,
        ascending: TYPE_SCALE_PX[cur] > TYPE_SCALE_PX[prev],
      }).toEqual({ pair: `${prev} -> ${cur}`, ascending: true });
    }
  });

  it("lists every token exactly once", () => {
    const keys = Object.keys(TYPE_SCALE_PX) as TypeToken[];
    expect([...ASCENDING_TOKENS].sort()).toEqual([...keys].sort());
    expect(new Set(ASCENDING_TOKENS).size).toBe(ASCENDING_TOKENS.length);
  });
});

describe("oneStepUp - the function that would have prevented the nav bug", () => {
  it("goes UP from sm, and the answer is not base", () => {
    // The actual mistake in headerLink.tsx, three times over.
    expect(oneStepUp("sm")).toBe("md");
    expect(oneStepUp("sm")).not.toBe("base");
    expect(isLarger(oneStepUp("sm"), "sm")).toBe(true);
  });

  it("always returns something at least as large, never smaller", () => {
    for (const token of ASCENDING_TOKENS) {
      expect({
        token,
        notSmaller: TYPE_SCALE_PX[oneStepUp(token)] >= TYPE_SCALE_PX[token],
      }).toEqual({ token, notSmaller: true });
    }
  });

  it("saturates at the largest token rather than falling off the end", () => {
    const largest = ASCENDING_TOKENS[ASCENDING_TOKENS.length - 1];
    expect(oneStepUp(largest)).toBe(largest);
  });
});

describe("the iOS zoom threshold", () => {
  it("still catches the small tokens, which is why the guard stays", () => {
    // Most inputs use text-sm or smaller, so `max-sm:focus:text-[16px]` is
    // still load-bearing on all fifteen of them.
    for (const token of ["xs", "sm", "md", "heading"] as const) {
      expect({ token, zooms: triggersIosZoom(token) }).toEqual({
        token,
        zooms: true,
      });
    }
  });

  it("no longer catches base, now that base is 1rem", () => {
    // A field at text-base clears the threshold on its own. This is a direct
    // consequence of removing the override, and worth pinning: if base ever
    // drops below 16 again, this fails.
    expect(triggersIosZoom("base")).toBe(false);
    expect(triggersIosZoom("lg")).toBe(false);
  });
});
