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
 * A one-shot diagnostic for a stall, or null if there is nothing to report.
 *
 * Reported ONCE per stall, not per render, and only when the notice is genuinely
 * blocking someone. The point is to make an unclickable checkbox visible in
 * Sentry, since it produces no exception of its own.
 *
 * Carries no user identifiers - only whether the page had finished loading, which
 * is the single most useful fact for distinguishing "main thread was busy" from
 * "something is covering the modal".
 */
export const stallReport = (
  state: GateState,
  documentReadyState: string,
  alreadyReported: boolean
): {
  message: string;
  documentReadyState: string;
  openedForMs: number;
} | null => {
  if (alreadyReported) return null;
  if (!isStalled(state)) return null;
  return {
    message: "Testnet notice unacknowledged after the stall threshold",
    documentReadyState,
    openedForMs: state.openedForMs,
  };
};
