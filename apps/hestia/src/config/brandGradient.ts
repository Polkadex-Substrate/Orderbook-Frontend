/**
 * The brand gradient, in one place.
 *
 * WHY THIS EXISTS
 * `from-primary-base to-[#6745D2]` was written out three times: twice as
 * gradient text on headings (`faq`, `rewards/comingSoon`) and once as the fill
 * of the "Start placing offers" button. Two problems with that.
 *
 * First, `#6745D2` is a BRAND COLOUR expressed as an arbitrary-value literal, so
 * it is invisible to the theme and to any search for brand tokens. A rebrand is
 * coming, and a hex hidden inside a Tailwind arbitrary value is exactly the kind
 * of thing that survives a rename and then looks wrong. See UX-LEARNINGS 9.6 for
 * the same lesson learned from a hardcoded product URL.
 *
 * Second, a design review asked to adopt this button treatment "across all the
 * web". That is a real decision, not a copy-paste: the app uses `Button.Solid`
 * from `@aksumite/ui` in 38 files, and this gradient in exactly one. Propagating
 * a hand-rolled style to 38 call sites would be the seven-copies-of-the-regex
 * mistake again. The correct route is a variant in the UX package, which is a
 * separate published dependency and needs a version bump and a visual pass.
 *
 * So this module does the part that is safe and useful now: one definition, so
 * that whichever way the decision goes, it changes in one place.
 */

/** Stops of the brand gradient. `#6745D2` is the secondary brand colour. */
export const BRAND_GRADIENT = "bg-gradient-to-r from-primary-base to-[#6745D2]";

/** Gradient applied to text rather than to a fill, for display headings. */
export const BRAND_GRADIENT_TEXT = `${BRAND_GRADIENT} bg-clip-text text-transparent`;

/**
 * The pill button treatment the design review pointed at.
 *
 * Kept here rather than promoted to a shared component on purpose: a component
 * would imply this is the sanctioned primary button, and it is not yet. It is
 * one marketing-surface treatment pending a decision about `Button.Solid`.
 */
export const BRAND_GRADIENT_PILL = [
  BRAND_GRADIENT,
  "inline-flex items-center gap-2 rounded-full px-6 py-3",
  "text-sm font-semibold text-white transition-opacity hover:opacity-90",
].join(" ");
