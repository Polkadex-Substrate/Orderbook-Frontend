import {
  GateState,
  STALL_AFTER_MS,
  blockedMessage,
  canProceed,
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

describe("stallReport: making a non-error visible to Sentry", () => {
  it("reports once a stall is reached", () => {
    const r = stallReport(
      state({ openedForMs: STALL_AFTER_MS }),
      "loading",
      false
    );
    expect(r).not.toBeNull();
    expect(r?.documentReadyState).toBe("loading");
    expect(r?.openedForMs).toBe(STALL_AFTER_MS);
  });

  it("reports at most once per stall, not once per render", () => {
    // A modal open for a minute re-renders many times. Without this, one stuck
    // user becomes dozens of events, which is how a real signal gets ignored.
    expect(
      stallReport(state({ openedForMs: STALL_AFTER_MS }), "loading", true)
    ).toBeNull();
  });

  it("stays silent when nobody is stuck", () => {
    expect(stallReport(state(), "complete", false)).toBeNull();
    expect(
      stallReport(
        state({ checked: true, openedForMs: STALL_AFTER_MS }),
        "complete",
        false
      )
    ).toBeNull();
  });

  it("carries readyState, which is the fact that discriminates the causes", () => {
    // "loading" points at a busy main thread; "complete" points at something
    // covering the modal. Without this the report says only "someone was stuck".
    const busy = stallReport(
      state({ openedForMs: STALL_AFTER_MS }),
      "loading",
      false
    );
    const idle = stallReport(
      state({ openedForMs: STALL_AFTER_MS }),
      "complete",
      false
    );
    expect(busy?.documentReadyState).not.toBe(idle?.documentReadyState);
  });

  it("carries no user identifiers", () => {
    const r = stallReport(
      state({ openedForMs: STALL_AFTER_MS }),
      "loading",
      false
    );
    expect(Object.keys(r ?? {}).sort()).toEqual([
      "documentReadyState",
      "message",
      "openedForMs",
    ]);
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
