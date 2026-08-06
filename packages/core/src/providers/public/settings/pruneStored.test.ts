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
