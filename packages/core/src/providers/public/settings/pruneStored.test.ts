import { pruneStoredNotifications } from "./pruneStored";

/*
 * Ground truth: the "Hestia UI Upgrade" announcement was injected into
 * localStorage by retired code and resurfaced weeks after every server-side
 * source was verified clean. The invariant: storage cannot keep an
 * announcement alive that the code/feed no longer publishes - while user
 * history (General) is never touched.
 */

const hestia = {
  id: "notification-hestia-upgrade",
  category: "Announcements",
  message: "Hestia UI Upgrade 🎉",
};
const fill = { id: "evt-1", category: "General", message: "Order filled" };
const current = {
  id: "maint-2026-08",
  category: "Announcements",
  message: "Maintenance window",
};

/*
 * COMPILE-TIME GUARD (this block asserts nothing at runtime and everything at
 * build time).
 *
 * The first version of the constraint carried an index signature, which quietly
 * excluded interfaces - `T.Notification` is one - so generic inference collapsed
 * to the constraint and the real caller got `StoredNotificationLike[]` back with
 * `date` degraded to `unknown`. Jest was perfectly green while `tsc` had four
 * errors, because a broken generic signature is invisible to runtime tests.
 *
 * `NotificationShape` deliberately mirrors T.Notification as an INTERFACE (no
 * index signature) rather than importing it: pruneStored.ts is import-free by
 * design so it stays trivially unit-testable. If the constraint regresses, the
 * `date - date` arithmetic below stops compiling.
 */
interface NotificationShape {
  id: string;
  category: "General" | "Announcements";
  message: string;
  date: number;
  active: boolean;
}

const typedEntry: NotificationShape = {
  id: "evt-2",
  category: "General",
  message: "Withdraw complete",
  date: 1_754_000_000_000,
  active: true,
};

describe("pruneStoredNotifications - type surface", () => {
  it("returns the caller's own element type, not the constraint", () => {
    const out = pruneStoredNotifications([typedEntry], [], []);
    // Only compiles if out is NotificationShape[]: `date` must still be number
    // and `active` must still exist.
    const sorted = [...out].sort((a, b) => b.date - a.date);
    expect(sorted[0]?.active).toBe(true);
    expect(sorted[0]?.message).toBe("Withdraw complete");
  });
});

describe("pruneStoredNotifications", () => {
  it("drops a stored announcement that is no longer published - THE Hestia case", () => {
    const out = pruneStoredNotifications([hestia, fill], [], []);
    expect(out).toEqual([fill]);
  });

  it("keeps a stored announcement that is still published and not dismissed", () => {
    const out = pruneStoredNotifications(
      [current, fill],
      ["maint-2026-08"],
      []
    );
    expect(out).toEqual([current, fill]);
  });

  it("drops a still-published announcement the user dismissed", () => {
    const out = pruneStoredNotifications(
      [current],
      ["maint-2026-08"],
      ["maint-2026-08"]
    );
    expect(out).toEqual([]);
  });

  it("NEVER touches General entries, whatever the id situation", () => {
    // Order fills, transfers - user history. Pruning these would be data loss.
    const weird = {
      id: "notification-hestia-upgrade",
      category: "General",
      message: "x",
    };
    const out = pruneStoredNotifications([fill, weird], [], ["evt-1"]);
    expect(out).toEqual([fill, weird]);
  });

  it("keeps entries with no category (defensive - old shapes)", () => {
    const bare = { id: "old-1", message: "no category field" } as never;
    expect(pruneStoredNotifications([bare], [], [])).toEqual([bare]);
  });

  it("handles null/undefined inputs without throwing", () => {
    expect(pruneStoredNotifications(null, null, null)).toEqual([]);
    expect(pruneStoredNotifications(undefined, undefined, undefined)).toEqual(
      []
    );
    expect(pruneStoredNotifications([fill], undefined, null)).toEqual([fill]);
  });

  it("drops null entries inside the stored array", () => {
    const out = pruneStoredNotifications([fill, null as never, hestia], [], []);
    expect(out).toEqual([fill]);
  });
});
