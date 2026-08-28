import {
  GateState,
  REPORT_STALL_AFTER_MS,
  STALL_AFTER_MS,
  blockedMessage,
  canProceed,
  interceptionReport,
  isBlockedByLayer,
  isStalled,
  shouldDisableResizeHandles,
  shouldShowTestnetNotice,
  showEscapeHatch,
  stallReport,
} from "./testnetGate";

/*
 * Jest globals, matching the rest of this app.
 *
 * The reported failure is that the checkbox cannot be clicked, so these tests
 * are written from the position of a user whose interaction NEVER lands. The
 * property that matters is that such a user is still told something and still
 * has a way out, because the old design gave them a greyed-out button and
 * silence.
 */

const state = (over: Partial<GateState> = {}): GateState => ({
  checked: false,
  openedForMs: 0,
  attempted: false,
  ...over,
});

describe("shouldShowTestnetNotice", () => {
  it("shows only on a testnet, and only until acknowledged", () => {
    const cases: [boolean, boolean, boolean][] = [
      // isTestnet, alreadyAcked, expected
      [true, false, true],
      [true, true, false],
      [false, false, false],
      [false, true, false],
    ];
    for (const [isTestnet, acked, expected] of cases) {
      expect({
        isTestnet,
        acked,
        show: shouldShowTestnetNotice(isTestnet, acked),
      }).toEqual({ isTestnet, acked, show: expected });
    }
  });
});

describe("consent is unchanged: the tick is still required", () => {
  it("does not let anyone through without ticking", () => {
    // The fix must not weaken the gate. Enabling the button is about FEEDBACK,
    // not about bypassing consent.
    expect(canProceed(state())).toBe(false);
    expect(canProceed(state({ attempted: true }))).toBe(false);
    expect(canProceed(state({ openedForMs: 10 * STALL_AFTER_MS }))).toBe(false);
    expect(canProceed(state({ checked: true }))).toBe(true);
  });
});

describe("the reported dead end: no feedback, no way out", () => {
  it("says nothing before the user has tried", () => {
    // No scolding on open. The message is a response to an action.
    expect(blockedMessage(state())).toBeNull();
  });

  it("explains itself when someone presses Continue without a tick", () => {
    // Previously impossible: the button was disabled, so a user whose tick did
    // not register received silence and had to guess.
    expect(blockedMessage(state({ attempted: true }))).toContain("testnet");
  });

  it("says nothing once the tick is registered", () => {
    expect(
      blockedMessage(state({ checked: true, attempted: true }))
    ).toBeNull();
  });

  it("offers an escape hatch to someone whose clicks never land", () => {
    // The crucial case. This user has NOT successfully interacted with anything,
    // so any help gated on a successful interaction would never reach them.
    const trapped = state({ openedForMs: STALL_AFTER_MS, attempted: false });
    expect(isStalled(trapped)).toBe(true);
    expect(showEscapeHatch(trapped)).toBe(true);
  });

  it("does not offer it to someone merely reading carefully", () => {
    expect(isStalled(state({ openedForMs: STALL_AFTER_MS - 1 }))).toBe(false);
  });

  it("does not nag someone who has already ticked but not continued", () => {
    // They are fine. The control works, they are just still reading.
    const reading = state({ checked: true, openedForMs: 10 * STALL_AFTER_MS });
    expect(isStalled(reading)).toBe(false);
    expect(showEscapeHatch(reading)).toBe(false);
  });
});

describe("stallReport: only a gate that is genuinely blocked", () => {
  /*
   * REWRITTEN. ORDERBOOK-TESTNET-D collected six events across five users and
   * every one was a false positive: the report fired on elapsed time alone, so
   * it reported people for reading. Two sampled events proved it -
   *
   *     Android  openedForMs 20001  bodyPointerEvents "none"
   *     Windows  openedForMs 20451  bodyPointerEvents "auto"
   *
   * - the second on a demonstrably interactive page. An instrument that cries
   * wolf is worse than no instrument, because it teaches everyone to skim.
   *
   * Two conditions are now required, and the tests below are organised around
   * proving that NEITHER alone is enough.
   */
  const BLOCKED = "none";
  const FINE = "auto";
  const LONG = REPORT_STALL_AFTER_MS;

  it("reports when time AND evidence both say blocked", () => {
    const r = stallReport(
      state({ openedForMs: LONG }),
      "complete",
      false,
      BLOCKED
    );
    expect(r).not.toBeNull();
    expect(r?.openedForMs).toBe(LONG);
    expect(r?.bodyPointerEvents).toBe(BLOCKED);
  });

  it("stays silent for a slow READER - the entire false-positive class", () => {
    // The Windows event from the issue: past the old threshold, page fine.
    expect(
      stallReport(state({ openedForMs: LONG }), "complete", false, FINE)
    ).toBeNull();
    // And far past it. Time alone never triggers a report, at any duration.
    expect(
      stallReport(state({ openedForMs: LONG * 100 }), "complete", false, FINE)
    ).toBeNull();
  });

  it("stays silent on evidence alone, before the threshold", () => {
    // Body pointer-events is legitimately "none" for a moment while any Radix
    // layer opens. Reporting immediately would swap one false positive for
    // another.
    expect(
      stallReport(state({ openedForMs: 500 }), "complete", false, BLOCKED)
    ).toBeNull();
  });

  it("does not fire at the OLD threshold, which is now only for the escape hatch", () => {
    // The two thresholds are deliberately different. Help arrives at 20s; a
    // report needs much longer, because help is cheap and a false report is not.
    expect(STALL_AFTER_MS).toBeLessThan(REPORT_STALL_AFTER_MS);
    expect(
      stallReport(
        state({ openedForMs: STALL_AFTER_MS }),
        "complete",
        false,
        BLOCKED
      )
    ).toBeNull();
  });

  it("reports at most once, not once per render", () => {
    // A modal open for a minute re-renders many times. One stuck user must not
    // become dozens of events.
    expect(
      stallReport(state({ openedForMs: LONG }), "complete", true, BLOCKED)
    ).toBeNull();
  });

  it("stays silent once the user has ticked", () => {
    expect(
      stallReport(
        state({ checked: true, openedForMs: LONG }),
        "complete",
        false,
        BLOCKED
      )
    ).toBeNull();
  });

  it("survives a missing pointer-events value without reporting", () => {
    // Server render, or a browser that gives nothing back. Absence of evidence
    // is not evidence.
    for (const value of [null, undefined, "", "unknown"]) {
      expect(
        stallReport(state({ openedForMs: LONG }), "complete", false, value)
      ).toBeNull();
    }
  });

  it("carries readyState, which discriminates the remaining causes", () => {
    const busy = stallReport(
      state({ openedForMs: LONG }),
      "loading",
      false,
      BLOCKED
    );
    const idle = stallReport(
      state({ openedForMs: LONG }),
      "complete",
      false,
      BLOCKED
    );
    expect(busy?.documentReadyState).not.toBe(idle?.documentReadyState);
  });

  it("carries no user identifiers", () => {
    const r = stallReport(
      state({ openedForMs: LONG }),
      "loading",
      false,
      BLOCKED
    );
    expect(Object.keys(r ?? {}).sort()).toEqual([
      "bodyPointerEvents",
      "documentReadyState",
      "message",
      "openedForMs",
    ]);
  });

  it("uses a NEW message, so the noisy issue is not reopened", () => {
    // Sentry groups by message. Reusing the old text would drop real events
    // into a group full of false positives that everyone has learned to ignore.
    const r = stallReport(
      state({ openedForMs: LONG }),
      "complete",
      false,
      BLOCKED
    );
    expect(r?.message).not.toContain(
      "unacknowledged after the stall threshold"
    );
    expect(r?.message).toContain("pointer-events");
  });
});

describe("isBlockedByLayer", () => {
  it("is true only for an explicit none", () => {
    expect(isBlockedByLayer("none")).toBe(true);
    for (const v of ["auto", "all", "", null, undefined, "NONE"]) {
      expect(isBlockedByLayer(v)).toBe(false);
    }
  });
});

describe("shouldDisableResizeHandles - the checkbox that would not tick", () => {
  /*
   * The second cause of an unclickable gate, and a different one from the Radix
   * pointer-events bug that prompted the native <dialog> rewrite.
   *
   * react-resizable-panels intercepts pointerdown on <body> in the capture
   * phase and calls stopImmediatePropagation when the pointer falls inside a
   * handle's hit area, which deletes the click before it reaches the checkbox.
   * Its guard against this compares stacking order and cannot see the top
   * layer, so the dialog is invisible to it. Disabling the handles empties the
   * library's registry, and an empty registry attaches no listeners.
   */

  it("disables handles exactly while the notice is showing", () => {
    // Tied to the same condition deliberately: if the gate is up, nothing
    // behind it should be resizable. Two conditions that could drift apart is
    // how a fix like this rots.
    for (const [isTestnet, acked] of [
      [true, false],
      [true, true],
      [false, false],
      [false, true],
    ] as const) {
      expect({
        isTestnet,
        acked,
        disabled: shouldDisableResizeHandles(isTestnet, acked),
      }).toEqual({
        isTestnet,
        acked,
        disabled: shouldShowTestnetNotice(isTestnet, acked),
      });
    }
  });

  it("blocks resizing on an unacknowledged testnet", () => {
    expect(shouldDisableResizeHandles(true, false)).toBe(true);
  });

  it("restores resizing the moment the notice is acknowledged", () => {
    // The handles must come back, or the fix for an unclickable checkbox
    // becomes a permanently unresizable trading layout.
    expect(shouldDisableResizeHandles(true, true)).toBe(false);
  });

  it("never disables anything on mainnet", () => {
    // Mainnet shows no notice, so there is nothing to protect and no reason to
    // take a feature away.
    expect(shouldDisableResizeHandles(false, false)).toBe(false);
    expect(shouldDisableResizeHandles(false, true)).toBe(false);
  });
});

/*
 * `stallReport` above only fires when body carries `pointer-events: none`. That
 * gate is correct for the Radix layer bug, and it is why the reporter stopped
 * accusing people of being stuck when they were reading. But it made the
 * instrument specific to one cause, and users kept reporting a dead Continue
 * button while Sentry stayed silent.
 *
 * A hit test asks the browser what is actually on top of the button, whatever
 * the reason.
 */
const LONG_ENOUGH = REPORT_STALL_AFTER_MS + 1;
const covered = {
  ran: true,
  insideDialog: false,
  topElement: "div.overlay-backdrop",
  topElementFound: true,
  pointInViewport: true,
  viewportSized: true,
};
const clear = {
  ran: true,
  insideDialog: true,
  topElement: "button",
  topElementFound: true,
  pointInViewport: true,
  viewportSized: true,
};

describe("interceptionReport: something is physically covering the button", () => {
  it("reports what is on top, by name, in the title", () => {
    // The name in the TITLE is the point. An issue called "notice covered by
    // div.overlay-backdrop" is actionable from the issue list; one called
    // "<unknown>" sat unread for two weeks.
    const r = interceptionReport(
      state({ openedForMs: LONG_ENOUGH }),
      covered,
      false
    );
    expect(r).not.toBeNull();
    expect(r?.message).toContain("div.overlay-backdrop");
    expect(r?.topElement).toBe("div.overlay-backdrop");
  });

  it("says nothing when the button is reachable", () => {
    expect(
      interceptionReport(state({ openedForMs: LONG_ENOUGH }), clear, false)
    ).toBeNull();
  });

  it("says nothing when the hit test could not run", () => {
    // A test we could not run is not evidence of a clear path OR a blocked one.
    // Treating "unknown" as "blocked" is exactly how the old reporter produced
    // six false positives.
    expect(
      interceptionReport(
        state({ openedForMs: LONG_ENOUGH }),
        { ...covered, ran: false, topElement: "unknown" },
        false
      )
    ).toBeNull();
  });

  it("never reports from a zero-sized viewport", () => {
    // ORDERBOOK-TESTNET-Q, the first event this reporter ever produced: a
    // hidden browser pane during testing. elementFromPoint returns null for
    // EVERY point when the viewport is 0x0, and the old code read that as
    // "covered", emitting the sentence "Testnet notice covered by nothing".
    // An instrument whose first output is an artifact of the instrument needs
    // a guard, not an explanation.
    expect(
      interceptionReport(
        state({ openedForMs: LONG_ENOUGH }),
        {
          ...covered,
          viewportSized: false,
          topElement: "nothing",
          topElementFound: false,
        },
        false
      )
    ).toBeNull();
  });

  it("reports an off-screen button as its own distinct failure", () => {
    // A native <dialog> in the top layer does not scroll the page behind it, so
    // on a short viewport the consent controls can sit below the fold. To the
    // user that is indistinguishable from a dead button - the exact report we
    // have been chasing - but the fix is different, so the message must be too.
    const r = interceptionReport(
      state({ openedForMs: LONG_ENOUGH }),
      {
        ...covered,
        pointInViewport: false,
        topElement: "nothing",
        topElementFound: false,
      },
      false
    );
    expect(r).not.toBeNull();
    expect(r?.message).toMatch(/outside the viewport/i);
    expect(r?.message).not.toContain("covered by");
  });

  it("never emits the phrase 'covered by nothing'", () => {
    // The sentence that proved the premise was wrong. Guarding it directly so
    // it cannot come back by a different route.
    for (const ht of [
      {
        ...covered,
        pointInViewport: false,
        topElement: "nothing",
        topElementFound: false,
      },
      {
        ...covered,
        viewportSized: false,
        topElement: "nothing",
        topElementFound: false,
      },
      { ...covered, topElement: "nothing", topElementFound: false },
    ]) {
      const r = interceptionReport(
        state({ openedForMs: LONG_ENOUGH }),
        ht,
        false
      );
      expect(r?.message ?? "").not.toContain("covered by nothing");
    }
  });

  it("does not report a reader who has not got there yet", () => {
    expect(
      interceptionReport(state({ openedForMs: 500 }), covered, false)
    ).toBeNull();
  });

  it("does not report once the user has ticked the box", () => {
    // Having ticked it proves the click landed, so whatever is on top is not
    // stopping them.
    expect(
      interceptionReport(
        state({ openedForMs: LONG_ENOUGH, checked: true }),
        covered,
        false
      )
    ).toBeNull();
  });

  it("reports once, not once per second thereafter", () => {
    expect(
      interceptionReport(state({ openedForMs: LONG_ENOUGH }), covered, true)
    ).toBeNull();
  });

  it("carries no user identifiers", () => {
    const r = interceptionReport(
      state({ openedForMs: LONG_ENOUGH }),
      covered,
      false
    );
    expect(Object.keys(r ?? {}).sort()).toEqual([
      "message",
      "openedForMs",
      "topElement",
    ]);
  });
});
