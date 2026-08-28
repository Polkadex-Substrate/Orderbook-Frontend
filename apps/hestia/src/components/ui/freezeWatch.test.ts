import {
  FREEZE_OVERSHOOT_MS,
  FREEZE_TICK_MS,
  MAX_CREDIBLE_FREEZE_MS,
  driftMs,
  freezeMessage,
  freezeVerdict,
} from "./freezeWatch";

/*
 * Ground truth: users report the trading page freezing on load, with the
 * testnet notice visible, the checkbox unclickable and the Continue button
 * dead. Six rounds of investigation found no Sentry evidence, and the reason
 * was that `stallReport` derives elapsed time from a setInterval - which does
 * not fire while the thread is blocked. The instrument required a healthy page
 * in order to report an unhealthy one.
 *
 * These tests pin the property that fixes it: the gap is visible on the first
 * tick AFTER recovery.
 */

const healthy = {
  tickMs: FREEZE_TICK_MS,
  wasVisibleThroughout: true,
  alreadyReported: false,
};

describe("driftMs", () => {
  it("is zero for a tick that arrives on time", () => {
    expect(driftMs(1_000, 1_000)).toBe(0);
  });

  it("is zero, never negative, for an early tick", () => {
    // Some browsers fire marginally early. Negative drift would subtract from
    // a later real freeze if these were ever accumulated.
    expect(driftMs(940, 1_000)).toBe(0);
  });

  it("reports how late a tick was", () => {
    expect(driftMs(12_000, 1_000)).toBe(11_000);
  });

  it("survives NaN and Infinity rather than propagating them", () => {
    // Date arithmetic across a clock change can produce either, and a NaN here
    // would silently disable the detector by failing every comparison.
    expect(driftMs(NaN, 1_000)).toBe(0);
    expect(driftMs(Infinity, Infinity)).toBe(0);
  });
});

describe("freezeVerdict - the case the old instrument could not see", () => {
  it("reports an 11 second block on the first tick after recovery", () => {
    const v = freezeVerdict({ ...healthy, gapMs: 12_000 });
    expect(v.frozen).toBe(true);
    if (!v.frozen) throw new Error("unreachable");
    expect(v.blockedForMs).toBe(11_000);
    expect(v.clamped).toBe(false);
  });

  it("ignores ordinary timer jitter", () => {
    // A long GC or a heavy parse. Reporting these would bury the real events,
    // which is exactly how ORDERBOOK-TESTNET-D became useless.
    for (const gap of [1_000, 1_050, 1_400, 1_900]) {
      expect(freezeVerdict({ ...healthy, gapMs: gap }).frozen).toBe(false);
    }
  });

  it("fires exactly at the threshold, not a millisecond before", () => {
    expect(
      freezeVerdict({
        ...healthy,
        gapMs: FREEZE_TICK_MS + FREEZE_OVERSHOOT_MS - 1,
      }).frozen
    ).toBe(false);
    expect(
      freezeVerdict({ ...healthy, gapMs: FREEZE_TICK_MS + FREEZE_OVERSHOOT_MS })
        .frozen
    ).toBe(true);
  });

  it("does NOT report a backgrounded tab", () => {
    // The single most important false positive to exclude. Browsers throttle
    // background timers to once a minute, which is indistinguishable from a
    // 59 second freeze. Without this the top of the list would be people who
    // switched tabs - the same mistake as measuring reading speed.
    const v = freezeVerdict({
      ...healthy,
      gapMs: 60_000,
      wasVisibleThroughout: false,
    });
    expect(v.frozen).toBe(false);
    if (v.frozen) throw new Error("unreachable");
    expect(v.reason).toMatch(/hidden/i);
  });

  it("reports once per occurrence, not once per tick afterwards", () => {
    expect(
      freezeVerdict({ ...healthy, gapMs: 12_000, alreadyReported: true }).frozen
    ).toBe(false);
  });

  it("clamps a laptop-lid gap instead of letting it skew the aggregate", () => {
    const v = freezeVerdict({ ...healthy, gapMs: 4 * 60 * 60 * 1_000 });
    expect(v.frozen).toBe(true);
    if (!v.frozen) throw new Error("unreachable");
    expect(v.blockedForMs).toBe(MAX_CREDIBLE_FREEZE_MS);
    expect(v.clamped).toBe(true);
  });
});

describe("freezeMessage - one issue, not one per user", () => {
  it("buckets the duration so Sentry groups the events together", () => {
    // Sentry groups by message. An exact millisecond count would create a
    // separate issue per event, which is the failure mode the ignore-list and
    // the dedupe gate both exist to prevent.
    expect(freezeMessage(3_000)).toBe(freezeMessage(4_200));
    expect(freezeMessage(3_000)).not.toBe(freezeMessage(30_000));
  });

  it("names the duration in a form a human can triage", () => {
    expect(freezeMessage(11_000)).toContain("5-15s");
    expect(freezeMessage(11_000)).toMatch(/blocked/i);
  });

  it("covers every bucket boundary without gaps", () => {
    for (const ms of [2_000, 4_999, 5_000, 14_999, 15_000, 59_999, 60_000]) {
      expect(freezeMessage(ms)).toMatch(/2-5s|5-15s|15-60s|60s\+/);
    }
  });
});
