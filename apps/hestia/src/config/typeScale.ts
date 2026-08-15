/**
 * The app's effective font-size scale, and the ordering it must satisfy.
 *
 * THE BUG THIS RECORDS, NOW FIXED
 * `themeConfig.ts` used to override Tailwind's `base` with 0.80rem while
 * leaving `sm` at 0.875rem, producing an INVERTED scale in which `text-base`
 * was smaller than `text-sm`:
 *
 *     xs 12.0  <  base 12.8  <  sm 14.0  <  md 14.4  <  heading 15.2  <  lg 18
 *
 * It bit exactly where you would expect. `headerLink.tsx` carried
 * `min-[1680px]:text-base` in three places with a comment saying it moved nav
 * links "up a step" on wide screens; it moved them DOWN, 14px to 12.8px, so the
 * primary navigation shrank on a 4K display. A reviewer then asked for the nav
 * to be enlarged, which was the same defect arriving as a design complaint.
 *
 * Worse, `@aksumite/ui` ships a prebuilt stylesheet containing
 * `.text-base{font-size:1rem}`. The same class therefore meant 16px inside a
 * design-system component and 12.8px in app markup, resolved by stylesheet
 * order. The override has been removed, so `base` is 1rem again and the app
 * agrees with its own design system.
 *
 * WHAT THIS MODULE IS FOR
 * One place stating the real numbers, so a size is chosen by what it measures
 * rather than by what it is called, plus an ordering the test asserts. The
 * inversion was invisible to review and to types; only arithmetic caught it, so
 * the arithmetic lives here permanently.
 *
 * Import-free so the values are testable without Tailwind or a renderer.
 */

/** Effective size of each token, in px, at a 16px root. */
export const TYPE_SCALE_PX = {
  xs: 12, // Tailwind default 0.75rem
  sm: 14, // Tailwind default 0.875rem
  md: 14.4, // themeConfig 0.9rem
  heading: 15.2, // themeConfig 0.95rem
  base: 16, // Tailwind default 1rem - override REMOVED 2026-08-15
  lg: 18, // Tailwind default 1.125rem
  xl: 20, // Tailwind default 1.25rem
} as const;

export type TypeToken = keyof typeof TYPE_SCALE_PX;

/** Tokens in ascending size order. The order is the point, not the list. */
export const ASCENDING_TOKENS: readonly TypeToken[] = [
  "xs",
  "sm",
  "md",
  "heading",
  "base",
  "lg",
  "xl",
];

/**
 * The next token up from `token`, or the same one if it is already the largest.
 *
 * Use this instead of guessing. "One step up from sm" is `md`. It was NOT
 * `base` while the override existed, and that mistake was in the codebase three
 * times.
 */
export const oneStepUp = (token: TypeToken): TypeToken => {
  const i = ASCENDING_TOKENS.indexOf(token);
  if (i < 0 || i === ASCENDING_TOKENS.length - 1) return token;
  return ASCENDING_TOKENS[i + 1];
};

/** Is `a` genuinely larger than `b`? Answers by measurement, not by name. */
export const isLarger = (a: TypeToken, b: TypeToken): boolean =>
  TYPE_SCALE_PX[a] > TYPE_SCALE_PX[b];

/**
 * iOS Safari zooms the page when a focused input renders below this size.
 *
 * Every text input in this app carries `max-sm:focus:text-[16px]`. With `base`
 * restored to 1rem a field using `text-base` now clears the threshold on its
 * own, but the guard stays: most fields use `text-sm` or smaller, and removing
 * it per-field would be a change nobody could verify without an iPhone.
 */
export const IOS_NO_ZOOM_PX = 16;

/** Would an input at this token trigger the iOS zoom? */
export const triggersIosZoom = (token: TypeToken): boolean =>
  TYPE_SCALE_PX[token] < IOS_NO_ZOOM_PX;
