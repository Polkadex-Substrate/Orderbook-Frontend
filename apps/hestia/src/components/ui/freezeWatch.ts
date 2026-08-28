/**
 * Detecting a main-thread freeze AFTER it ends, by measuring timer drift.
 *
 * WHY THIS EXISTS
 * `stallReport` in testnetGate.ts was built to make "the notice is stuck" an
 * observable signal, and it cannot see a freeze. Not by accident - by
 * construction:
 *
 *     setInterval(() => setOpenedForMs(Date.now() - startedAt), 1_000)
 *     ...
 *     if (state.openedForMs < REPORT_STALL_AFTER_MS) return null;
 *
 * `openedForMs` only advances when the interval fires, and the interval only
 * fires when the main thread is free. During an actual freeze the callback does
 * not run, React does not re-render, the effect that reports does not execute,
 * and elapsed time stays frozen along with everything else. The instrument
 * needs the thread to be healthy in order to report that the thread is not.
 *
 * The consequence was six weeks of "Sentry shows nothing" being read as
 * evidence of absence. ORDERBOOK-TESTNET-D fired six times, every one a person
 * reading slowly, and zero times for the failure it was written for.
 *
 * THE FIX: MEASURE DRIFT, NOT COUNT
 * A timer set for 1000ms that next fires 12 seconds later proves the thread was
 * blocked for roughly 11 of them. The evidence arrives late, but it arrives -
 * the first tick after recovery carries the whole gap. That is the difference
 * between an instrument that can only see healthy pages and one that can report
 * the exact event we care about.
 *
 * Blocking is normal in small amounts: a garbage collection, a chunk being
 * parsed, a layout on a slow machine. The threshold has to sit above the noise
 * and below "the user has noticed", which is roughly a second.
 *
 * Import-free and pure, so every case is testable without freezing a browser.
 */

/** Interval period the caller schedules. Drift is measured against this. */
export const FREEZE_TICK_MS = 1_000;

/**
 * How far beyond the scheduled period counts as a freeze rather than jitter.
 *
 * 2 seconds of overshoot. Ordinary timer jitter is milliseconds; a long GC or a
 * heavy parse can reach a few hundred. Two seconds of the main thread being
 * unavailable is well past anything a user would not notice, and comfortably
 * above the noise floor, so this reports events rather than weather.
 *
 * Note that a BACKGROUNDED tab also throttles timers heavily, which is why
 * `freezeReport` requires the document to have been visible throughout.
 */
export const FREEZE_OVERSHOOT_MS = 2_000;

/**
 * Longest freeze we will report as a number rather than clamping.
 *
 * A machine resuming from sleep produces a gap of hours, which is not a freeze
 * and would otherwise dominate every aggregate in Sentry.
 */
export const MAX_CREDIBLE_FREEZE_MS = 120_000;

/** How late a tick was, in ms. Never negative: an early tick is not drift. */
export const driftMs = (
  gapMs: number,
  tickMs: number = FREEZE_TICK_MS
): number => {
  if (!Number.isFinite(gapMs) || !Number.isFinite(tickMs)) return 0;
  return Math.max(0, gapMs - tickMs);
};

export type FreezeInputs = {
  /** Wall-clock ms between the previous tick and this one. */
  gapMs: number;
  /** The period the interval was scheduled with. */
  tickMs?: number;
  /**
   * Was the document visible for the WHOLE gap?
   *
   * Browsers throttle timers in background tabs to once a minute or worse, so a
   * hidden tab manufactures drift indistinguishable from a freeze. Without this
   * the top of the Sentry list would be people who switched tabs, which is the
   * same false-positive trap that made the old reporter useless.
   */
  wasVisibleThroughout: boolean;
  /** One report per occurrence, not one per subsequent tick. */
  alreadyReported: boolean;
};

export type FreezeVerdict =
  | { frozen: false; reason: string }
  | { frozen: true; blockedForMs: number; clamped: boolean };

export const freezeVerdict = ({
  gapMs,
  tickMs = FREEZE_TICK_MS,
  wasVisibleThroughout,
  alreadyReported,
}: FreezeInputs): FreezeVerdict => {
  if (alreadyReported) return { frozen: false, reason: "already reported" };
  if (!wasVisibleThroughout)
    return { frozen: false, reason: "tab was hidden - timers are throttled" };

  const drift = driftMs(gapMs, tickMs);
  if (drift < FREEZE_OVERSHOOT_MS)
    return { frozen: false, reason: "within normal timer jitter" };

  // A gap of hours is a laptop lid, not a freeze. Report it, but clamped and
  // flagged, so it cannot skew the aggregate while still being visible.
  const clamped = drift > MAX_CREDIBLE_FREEZE_MS;
  return {
    frozen: true,
    blockedForMs: clamped ? MAX_CREDIBLE_FREEZE_MS : Math.round(drift),
    clamped,
  };
};

/**
 * The Sentry message for a freeze.
 *
 * Bucketed rather than exact, because Sentry groups by message: a distinct
 * millisecond count per event would create one issue per user and reproduce the
 * problem the ignore-list exists to prevent. The precise figure goes in `extra`.
 */
export const freezeMessage = (blockedForMs: number): string => {
  const seconds = blockedForMs / 1_000;
  const bucket =
    seconds < 5
      ? "2-5s"
      : seconds < 15
        ? "5-15s"
        : seconds < 60
          ? "15-60s"
          : "60s+";
  return `Main thread blocked for ${bucket} while the testnet notice was open`;
};
