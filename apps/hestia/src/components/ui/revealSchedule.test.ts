import { STALL_AFTER_MS } from "./testnetGate";
import {
  REVEAL_ITEM_COUNT,
  REVEAL_MUST_FINISH_WITHIN_MS,
  REVEAL_STAGGER_MS,
  consentRevealDelayMs,
  revealDelayMs,
  shouldStageReveal,
  totalRevealMs,
} from "./revealSchedule";

/*
 * Jest globals, matching the rest of this app.
 *
 * The properties worth testing here are not "does 260 times 2 equal 520". They
 * are the two ways a staged reveal on THIS modal could go wrong:
 *
 *   - the first line not being visible on open, so the gate looks broken;
 *   - the reveal outlasting the stall reporter, so the instrument that is
 *     supposed to detect a frozen gate ends up timing its own animation.
 */

describe("the first line is present immediately", () => {
  it("gives item 0 no delay at all", () => {
    // A modal that opens empty and fills in reads as broken, which is the
    // opposite of what this change is for.
    expect(revealDelayMs(0)).toBe(0);
  });

  it("staggers the rest in order", () => {
    const delays = Array.from({ length: REVEAL_ITEM_COUNT }, (_, i) =>
      revealDelayMs(i)
    );
    expect(delays).toEqual([...delays].sort((a, b) => a - b));
    expect(new Set(delays).size).toBe(REVEAL_ITEM_COUNT);
  });

  it("treats junk indices as the first item rather than throwing", () => {
    for (const index of [-1, -100, NaN, 0.4]) {
      expect(revealDelayMs(index)).toBe(0);
    }
  });
});

describe("consent arrives after the warnings, which is the whole request", () => {
  it("delays the checkbox and button past the last bullet", () => {
    expect(consentRevealDelayMs()).toBeGreaterThan(
      revealDelayMs(REVEAL_ITEM_COUNT - 1)
    );
  });

  it("is exactly one stagger after the last bullet, not an arbitrary pause", () => {
    expect(consentRevealDelayMs() - revealDelayMs(REVEAL_ITEM_COUNT - 1)).toBe(
      REVEAL_STAGGER_MS
    );
  });
});

describe("the reveal must not outlive the instrument watching for a freeze", () => {
  it("finishes well inside its own budget", () => {
    // Consent gates that feel stuck are the thing being fixed. Adding a long
    // performance in front of one is not an improvement.
    expect(totalRevealMs()).toBeLessThanOrEqual(REVEAL_MUST_FINISH_WITHIN_MS);
  });

  it("finishes far before the stall report fires", () => {
    /*
     * THE COUPLING THIS EXISTS TO PROTECT. The stall reporter has already been
     * filing false positives by measuring how long people take to read; if the
     * reveal ever approached that threshold it would be reporting its own
     * animation. Asserting against the real constant means tuning either one
     * without the other fails here.
     */
    expect(totalRevealMs()).toBeLessThan(STALL_AFTER_MS / 4);
  });
});

describe("reduced motion", () => {
  it("shows everything at once when motion is not wanted", () => {
    expect(shouldStageReveal(true)).toBe(false);
  });

  it("stages it otherwise", () => {
    expect(shouldStageReveal(false)).toBe(true);
  });
});
