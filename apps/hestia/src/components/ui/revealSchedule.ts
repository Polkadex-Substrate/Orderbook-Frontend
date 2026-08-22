/**
 * Timing for the testnet notice's staged reveal.
 *
 * THE SUGGESTION, AND THE CORRECTION
 * Proposed as a fix for the freeze: show the bullets one at a time, then the
 * checkbox and button, "to give the backend enough time to reload before the
 * user proceeds".
 *
 * The reveal is a good idea. The reason is not. The freeze is the browser's
 * MAIN THREAD blocked in JavaScript - Chrome reports "Page Unresponsive", no
 * request is in flight, and waiting never helped, which is why the page never
 * recovered on its own. Nothing this file does gives a backend time, because
 * time was never the missing ingredient.
 *
 * WHY IT IS STILL WORTH BUILDING - TWO REASONS THAT DO HOLD
 *
 * 1. Progressive disclosure. Four warnings landing at once is a wall of text on
 *    a 430px phone; arriving in sequence, they get read. That is the actual
 *    value, and it needs no theory about the backend.
 *
 * 2. IT MAKES A FROZEN TAB VISIBLE. CSS animations run on the compositor, so
 *    they keep going when the main thread is blocked. If the bullets keep
 *    appearing, the thread is alive and the user is merely reading. If they
 *    stop mid-sequence, the thread is dead. Today a frozen gate and a patient
 *    reader look identical - which is exactly why the stall reporter has been
 *    filing false positives for a week.
 *
 * WHY THE TIMING LIVES HERE AND THE ANIMATION IN CSS
 * The dangerous implementation is a `setTimeout` chain that reveals the button
 * last: on a blocked thread those timers never fire, so the button never
 * appears, and a freeze that currently leaves a visible (if unclickable) button
 * would leave nothing at all. Two earlier attempts at this modal failed exactly
 * that way - automatic behaviour added to a path I could not observe.
 *
 * So every element is RENDERED IMMEDIATELY and revealed by CSS
 * `animation-delay`. No JS decides when anything appears. A blocked thread
 * cannot stop the reveal, and cannot prevent the button from arriving.
 *
 * Import-free so the schedule is testable without a renderer.
 */

/** How long each item's fade lasts. */
export const REVEAL_DURATION_MS = 320;

/** Gap between the start of one item and the next. */
export const REVEAL_STAGGER_MS = 260;

/**
 * Number of bullets in the notice. Kept here because the schedule's total
 * duration depends on it, and the total is what must stay under the patience
 * of someone who just wants to trade.
 */
export const REVEAL_ITEM_COUNT = 4;

/**
 * Delay before item `index` starts, in ms.
 *
 * Index 0 starts immediately: the first line must be there on first paint, or
 * the modal opens empty and reads as broken.
 */
export const revealDelayMs = (index: number): number => {
  // Number.isFinite first: `Math.max(0, Math.trunc(NaN))` is NaN, which would
  // reach the DOM as `animation-delay: NaNms`. Browsers discard that, so the
  // item would appear instantly rather than in sequence - a silent failure,
  // caught by test rather than by review.
  if (!Number.isFinite(index) || index <= 0) return 0;
  return Math.trunc(index) * REVEAL_STAGGER_MS;
};

/**
 * When the checkbox and button finish arriving.
 *
 * They come after the bullets - that is the point of the suggestion - but the
 * total has to stay short. Consent is not improved by making people wait; a gate
 * that feels stuck is the thing being fixed, not the thing being added.
 */
export const consentRevealDelayMs = (): number =>
  revealDelayMs(REVEAL_ITEM_COUNT);

/** Total time from open to everything visible. */
export const totalRevealMs = (): number =>
  consentRevealDelayMs() + REVEAL_DURATION_MS;

/**
 * The reveal must finish long before the stall reporter fires, or the
 * instrument starts measuring its own animation.
 *
 * STALL_AFTER_MS is 20s in testnetGate.ts. This asserts the relationship rather
 * than trusting that whoever tunes one remembers the other.
 */
export const REVEAL_MUST_FINISH_WITHIN_MS = 5_000;

/**
 * Everything at once, no animation.
 *
 * For `prefers-reduced-motion`, and for anyone who has already acknowledged and
 * is seeing the notice again - a second viewing should not re-stage a
 * performance they have read.
 */
export const shouldStageReveal = (prefersReducedMotion: boolean): boolean =>
  !prefersReducedMotion;
