/**
 * The rules behind the testnet acknowledgement gate.
 *
 * THE BUG THIS ADDRESSES
 * A reviewer reported that the testnet notice sometimes gets "stuck loading in
 * the background with a spinner", and that when it does, the checkbox cannot be
 * ticked so there is no way to continue. Intermittent, and it clears on reload.
 *
 * The exact trigger is still under investigation. What is NOT in doubt is the
 * design flaw that turns a transient hiccup into a dead end, and that is what
 * this module fixes:
 *
 *   1. The modal could not be dismissed at all. `onOpenChange` was a no-op and
 *      there was no close control, by design, because it is a consent gate.
 *   2. The only way forward was `disabled={!checked}` on the button. So if the
 *      checkbox click failed to register for ANY reason, the user was left with
 *      a greyed-out button, no feedback, and no path but reload - which they had
 *      to work out for themselves.
 *
 * A gate with a single mechanism and no fallback fails closed onto the user. The
 * fix is not to weaken the consent, it is to make sure a failure is VISIBLE and
 * has an escape.
 *
 * WHY SENTRY NEVER SAW THIS
 * Being unable to click something is not an exception. Nothing throws, so no
 * event and no replay were ever captured. Our telemetry was blind to it by
 * construction, which is why a human noticing it "a few times" was the only way
 * it could surface. `stallReport` below exists to close that gap: it turns a
 * non-error into an observable signal.
 *
 * Import-free so the rules are testable without a renderer or a browser.
 */

/**
 * How long the notice may sit unacknowledged before we treat it as stalled.
 *
 * 20 seconds. Long enough that an ordinary reader is not accused of being stuck
 * (the notice is four bullet points, so a careful read is well under this), and
 * short enough that someone genuinely trapped is offered a way out before they
 * give up and close the tab.
 */
export const STALL_AFTER_MS = 20_000;

/**
 * How long before an unacknowledged notice is worth REPORTING.
 *
 * Separate from STALL_AFTER_MS, because offering help and filing telemetry are
 * different decisions and the evidence for them differs.
 *
 * WHY THIS EXISTS: ORDERBOOK-TESTNET-D, six events across five users in a week,
 * every one of them a false positive. Two sampled events settled it:
 *
 *     Android, New Delhi   openedForMs 20001   bodyPointerEvents "none"
 *     Windows, Ukraine     openedForMs 20451   bodyPointerEvents "auto"
 *
 * Both fired within half a second of the threshold, and the second had a fully
 * interactive page. The reporter was measuring READING SPEED. Four warnings and
 * a checkbox take more than twenty seconds if you actually read them, which is
 * what we ask people to do.
 *
 * Forty-five seconds is past any plausible careful read, and it is a secondary
 * gate anyway: the report now also requires positive evidence of being blocked.
 */
export const REPORT_STALL_AFTER_MS = 45_000;

/**
 * Should the notice be shown at all?
 *
 * @param isTestnet     Whether this deployment is a testnet.
 * @param alreadyAcked  Whether sessionStorage already records an acknowledgement.
 *
 * Kept as a function rather than inlined so the "storage threw" case has one
 * home. Private-mode Safari can throw on sessionStorage access, and a consent
 * gate that crashes the page it is gating would be worse than the bug above.
 */
export const shouldShowTestnetNotice = (
  isTestnet: boolean,
  alreadyAcked: boolean
): boolean => isTestnet && !alreadyAcked;

/**
 * Must the trading page's resize handles be switched off?
 *
 * THE BUG THIS FIXES: THE CHECKBOX THAT WOULD NOT TICK
 * Hovering the notice's checkbox showed a resize cursor, and clicking it did
 * nothing. Both come from `react-resizable-panels`, which registers
 * `pointerdown` and `pointermove` on `document.body` in the CAPTURE phase and,
 * when the pointer falls within a handle's hit area, does this:
 *
 *     event.preventDefault();
 *     if (!isWithinResizeHandle(target)) event.stopImmediatePropagation();
 *
 * A capture listener on `<body>` runs before the event can reach anything
 * inside it, so `stopImmediatePropagation` deletes the click on its way to the
 * checkbox. The same code path calls `setGlobalCursorStyle`, which injects
 * `*{cursor: ns-resize !important}` - that is the "scroll" cursor, applied to
 * every element on the page including ours.
 *
 * The library does try to handle this. It compares stacking order between the
 * click target and the handle, with a comment naming a modal as the case. But
 * `compare` is a fork of `stacking-order@2.0.0`: it reads z-index and DOM
 * order, and the browser's TOP LAYER is expressible in neither. Our notice is a
 * native `<dialog>` opened with `showModal()`, so it lives in the top layer and
 * that check cannot see it. The dialog is drawn above everything and, to this
 * library, is not there at all.
 *
 * Worth stating plainly: the rewrite onto a native `<dialog>` is what made the
 * library blind. A Radix modal has a z-index, which `compare` can read. Escaping
 * one library's pointer bookkeeping put us inside another's blind spot.
 *
 * `disabled` on a handle short-circuits the effect that registers it. Disable
 * every handle and the registry is empty, at which point the library attaches no
 * listeners at all - no preventDefault, no stopImmediatePropagation, no global
 * cursor rule. Nothing to intercept the click, because nothing is listening.
 *
 * Deliberately the same condition as the notice itself: while the gate blocks
 * the viewport, nothing behind it should be resizable anyway.
 */
export const shouldDisableResizeHandles = (
  isTestnet: boolean,
  alreadyAcked: boolean
): boolean => shouldShowTestnetNotice(isTestnet, alreadyAcked);

export type GateState = {
  /** Has the user ticked the acknowledgement? */
  checked: boolean;
  /** Milliseconds the notice has been open. */
  openedForMs: number;
  /** Has the user attempted to continue without ticking? */
  attempted: boolean;
};

/**
 * May the user proceed?
 *
 * Unchanged in substance: consent still requires the tick. What changed is that
 * the BUTTON is no longer disabled, so a click always produces a response. See
 * `blockedMessage`.
 */
export const canProceed = (state: GateState): boolean => state.checked === true;

/**
 * What to tell someone who pressed Continue without ticking.
 *
 * Returns null when there is nothing to say. The previous design said nothing
 * ever, because a disabled button cannot be clicked, so a user whose tick did
 * not register got silence and had to guess. Silence is the actual defect here.
 */
export const blockedMessage = (state: GateState): string | null => {
  if (canProceed(state)) return null;
  if (!state.attempted) return null;
  return "Please confirm you understand this is a testnet before continuing.";
};

/**
 * Has the notice been open long enough that we should offer a way out?
 *
 * Deliberately NOT gated on `attempted`. The reported failure is that the
 * checkbox does not respond to clicks at all, so requiring evidence of a
 * successful interaction before offering help would withhold it from exactly
 * the person who needs it.
 */
export const isStalled = (state: GateState): boolean =>
  !state.checked && state.openedForMs >= STALL_AFTER_MS;

/**
 * Should a reload escape hatch be visible?
 *
 * Same condition as `isStalled`, named separately because they are different
 * questions that happen to share an answer today. If the stall threshold is ever
 * split from the escape-hatch threshold, this is where that happens.
 */
export const showEscapeHatch = (state: GateState): boolean => isStalled(state);

/**
 * Is something holding pointer events off the page?
 *
 * `document.body` carrying `pointer-events: none` while a consent gate is open
 * is the fingerprint of the original bug: a Radix dismissable layer switches it
 * off and only the layer it considers topmost gets it back. That is EVIDENCE of
 * a blocked gate. Elapsed time is not - it is evidence of reading.
 */
export const isBlockedByLayer = (
  bodyPointerEvents: string | null | undefined
): boolean => bodyPointerEvents === "none";

/**
 * A one-shot diagnostic for a gate that is genuinely blocked, or null.
 *
 * REWRITTEN AFTER ORDERBOOK-TESTNET-D TURNED OUT TO BE ALL FALSE POSITIVES.
 * The old version fired on elapsed time alone, so it reported six people for
 * reading carefully - including one whose page was demonstrably interactive
 * (`bodyPointerEvents: "auto"`). An instrument that cries wolf teaches everyone
 * to skim the issue list, which is the same harm the Sentry ignore-list exists
 * to prevent. It was worse than no instrument.
 *
 * Two conditions now, and BOTH are required:
 *   - past REPORT_STALL_AFTER_MS, well beyond a careful read;
 *   - positive evidence of being blocked, not merely an absence of clicks.
 *
 * THE MESSAGE TEXT CHANGED DELIBERATELY. Sentry groups by message, so this
 * opens a new issue rather than adding to a group full of noise - and anything
 * arriving in the new one is real. Resolve TESTNET-D; do not reuse it.
 *
 * Still carries no user identifiers: how long, whether the document had
 * finished loading, and what body's pointer-events said.
 */
export const stallReport = (
  state: GateState,
  documentReadyState: string,
  alreadyReported: boolean,
  bodyPointerEvents: string | null | undefined
): {
  message: string;
  documentReadyState: string;
  openedForMs: number;
  bodyPointerEvents: string;
} | null => {
  if (alreadyReported) return null;
  if (state.checked) return null;
  if (state.openedForMs < REPORT_STALL_AFTER_MS) return null;
  // The load-bearing line. Without it this reports readers.
  if (!isBlockedByLayer(bodyPointerEvents)) return null;
  return {
    message: "Testnet notice blocked: body pointer-events is none",
    documentReadyState,
    openedForMs: state.openedForMs,
    bodyPointerEvents: String(bodyPointerEvents),
  };
};
