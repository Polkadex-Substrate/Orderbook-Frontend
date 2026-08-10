/**
 * The optional sound that plays when an order fills.
 *
 * WHY THIS EXISTS (requested 2026-08-10)
 * "How do we know whether the order executed... usually some sound should come
 * once the order executes. That's how it is in a few CEXs."
 *
 * The on-screen answer to that question already exists - see orderUpdateNotice -
 * but a trader watching the book rather than the corner of the screen can miss a
 * toast. Sound is the channel that does not need you to be looking.
 *
 * WHY IT IS OFF BY DEFAULT
 * A muted exchange that can be unmuted is recoverable. An exchange that makes an
 * unexpected noise in a tab someone left open a day ago is not: the first
 * reaction to unexplained audio is to close the tab, and they do not come back to
 * find the setting. Traders who want it will turn it on once and it persists.
 *
 * WHY THERE IS NO AUDIO FILE
 * The tone is synthesised with WebAudio. An asset would mean a binary in the
 * repo, a request that can 404, and a decode that can fail - three ways for a
 * notification to go silent, for a two-note chime. Synthesis has none of them and
 * costs no bytes.
 *
 * WHY THE DECISION IS SEPARATE FROM THE PLAYING
 * `shouldPlayFillSound` is pure, so the rules are testable without an
 * AudioContext, which does not exist in jsdom. `playFillSound` is the thin part
 * that touches the browser and is deliberately almost logic-free.
 */

/*
 * The localStorage key lives in LOCAL_STORAGE_ID with every other key, not here.
 * This module never touches storage - the caller reads the setting and passes
 * `enabled` in - which is what keeps it import-free and testable without a
 * browser.
 */

export type FillSoundKind = "filled" | "partial" | "cancelled" | "none";

/**
 * Should a sound play for this order update?
 *
 * Rules, and the reason for each:
 *   - setting off            silence. The whole point of a default-off feature.
 *   - a fill or partial fill play. This is the event that was asked for.
 *   - cancelled              silence. A cancellation is something the user just
 *                            did on purpose; confirming it audibly is noise.
 *   - "none"                 silence. orderUpdateNotice already decided there is
 *                            nothing to announce, and a sound with no matching
 *                            toast is worse than either alone - it tells you
 *                            something happened and refuses to say what.
 *   - document hidden        silence. A background tab making noise is the exact
 *                            failure this feature has to avoid, and it is the
 *                            reason people distrust audio notifications.
 */
export const shouldPlayFillSound = ({
  kind,
  enabled,
  documentHidden = false,
}: {
  kind: FillSoundKind;
  enabled: boolean;
  documentHidden?: boolean;
}): boolean => {
  if (!enabled) return false;
  if (documentHidden) return false;
  return kind === "filled" || kind === "partial";
};

/** Read the setting. Anything other than a stored "true" counts as off. */
export const isFillSoundEnabled = (
  stored: string | null | undefined
): boolean => stored === "true";

/**
 * Play a short two-note chime.
 *
 * Every failure path is swallowed. This is a notification: if audio is
 * unavailable, blocked by the browser's autoplay policy, or the context cannot
 * be created, the correct behaviour is to stay quiet and let the toast do its
 * job. Throwing from here would take down the subscription handler that is in
 * the middle of updating the order cache - the same shape of mistake as the
 * error toast that crashed on a missing title.
 *
 * Autoplay is not a practical problem despite being unsolvable in general:
 * placing an order is a user gesture, so the page is already permitted to make
 * sound by the time an order can fill.
 */
export const playFillSound = (): void => {
  try {
    if (typeof window === "undefined") return;

    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return;

    const ctx = new Ctor();
    const now = ctx.currentTime;

    // Two rising notes, E5 then A5. Short, quiet, and distinct from a system
    // alert so it does not read as an error.
    [
      { freq: 659.25, at: 0 },
      { freq: 880, at: 0.09 },
    ].forEach(({ freq, at }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;

      // Ramp rather than switch, because an instant start or stop on a sine wave
      // produces an audible click.
      gain.gain.setValueAtTime(0, now + at);
      gain.gain.linearRampToValueAtTime(0.08, now + at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + at);
      osc.stop(now + at + 0.18);
    });

    // Release the hardware. Browsers cap concurrent AudioContexts (Chrome at
    // six), so a trader with a busy session would go silent after six fills
    // without this.
    window.setTimeout(() => {
      ctx.close?.();
    }, 400);
  } catch {
    // Deliberately silent. See above.
  }
};
