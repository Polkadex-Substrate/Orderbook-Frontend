import {
  isFillSoundEnabled,
  shouldPlayFillSound,
  type FillSoundKind,
} from "./fillSound";

/*
 * Jest globals, matching the rest of this package.
 *
 * playFillSound is not tested here: it is a thin WebAudio wrapper, jsdom has no
 * AudioContext, and asserting on oscillator plumbing would test the mock rather
 * than the behaviour. Everything worth deciding lives in shouldPlayFillSound,
 * which is pure.
 */

const ALL_KINDS: FillSoundKind[] = ["filled", "partial", "cancelled", "none"];

describe("shouldPlayFillSound - the default", () => {
  it("is silent for every event when the setting is off", () => {
    // The feature ships off. If this test ever fails, the exchange started
    // making noise at people who never asked for it.
    for (const kind of ALL_KINDS) {
      expect({
        kind,
        plays: shouldPlayFillSound({ kind, enabled: false }),
      }).toEqual({ kind, plays: false });
    }
  });

  it("treats an absent stored setting as off", () => {
    expect(isFillSoundEnabled(null)).toBe(false);
    expect(isFillSoundEnabled(undefined)).toBe(false);
    expect(isFillSoundEnabled("")).toBe(false);
  });

  it("treats any value other than the exact string 'true' as off", () => {
    // Fails closed on a corrupted or half-migrated value, rather than treating
    // "anything truthy" as consent.
    for (const stored of ["1", "yes", "TRUE", "on", "false", "{}", " true "]) {
      expect({ stored, on: isFillSoundEnabled(stored) }).toEqual({
        stored,
        on: false,
      });
    }
  });

  it("is on only for the exact string 'true'", () => {
    expect(isFillSoundEnabled("true")).toBe(true);
  });
});

describe("shouldPlayFillSound - when enabled", () => {
  it("plays on a full fill, which is the requested behaviour", () => {
    expect(shouldPlayFillSound({ kind: "filled", enabled: true })).toBe(true);
  });

  it("plays on a partial fill", () => {
    // A partial fill is still "your order executed", and it is the case a
    // trader most wants to hear about because it usually needs a decision.
    expect(shouldPlayFillSound({ kind: "partial", enabled: true })).toBe(true);
  });

  it("stays silent on a cancellation", () => {
    // The user just pressed cancel. Confirming it audibly is noise.
    expect(shouldPlayFillSound({ kind: "cancelled", enabled: true })).toBe(
      false
    );
  });

  it("stays silent when there is nothing to announce", () => {
    // orderUpdateNotice returns "none" for a resting order and for a repeated
    // update carrying no new fill. A sound with no toast beside it says
    // something happened and refuses to say what.
    expect(shouldPlayFillSound({ kind: "none", enabled: true })).toBe(false);
  });
});

describe("shouldPlayFillSound - background tabs", () => {
  it("stays silent in a hidden tab even on a fill", () => {
    // The failure that makes people distrust audio notifications: a tab left
    // open yesterday making a noise today.
    expect(
      shouldPlayFillSound({
        kind: "filled",
        enabled: true,
        documentHidden: true,
      })
    ).toBe(false);
  });

  it("stays silent in a hidden tab for every kind", () => {
    for (const kind of ALL_KINDS) {
      expect({
        kind,
        plays: shouldPlayFillSound({
          kind,
          enabled: true,
          documentHidden: true,
        }),
      }).toEqual({ kind, plays: false });
    }
  });

  it("defaults documentHidden to false, so a caller that omits it still plays", () => {
    // The parameter is optional; omitting it must not accidentally mute the
    // whole feature.
    expect(shouldPlayFillSound({ kind: "filled", enabled: true })).toBe(true);
  });
});

describe("shouldPlayFillSound - the truth table, in full", () => {
  it("matches the intended matrix exactly", () => {
    // Written out so a future change to the rules has to change this table on
    // purpose rather than by accident.
    const table: Array<[FillSoundKind, boolean, boolean, boolean]> = [
      // kind,        enabled, hidden, expected
      ["filled", true, false, true],
      ["partial", true, false, true],
      ["cancelled", true, false, false],
      ["none", true, false, false],
      ["filled", false, false, false],
      ["partial", false, false, false],
      ["filled", true, true, false],
      ["filled", false, true, false],
    ];

    for (const [kind, enabled, documentHidden, expected] of table) {
      expect({
        kind,
        enabled,
        documentHidden,
        plays: shouldPlayFillSound({ kind, enabled, documentHidden }),
      }).toEqual({ kind, enabled, documentHidden, plays: expected });
    }
  });
});
