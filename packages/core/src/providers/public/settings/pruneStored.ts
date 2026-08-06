/**
 * Decide which STORED notifications are still valid on read.
 *
 * WHY THIS EXISTS
 * The retired pre-2026-08 code did not merely display its hardcoded
 * "Hestia UI Upgrade" announcement - it WROTE it into
 * localStorage["localnotifications"], where it became indistinguishable from a
 * real event notification. Removing the announcement from the code therefore
 * did not remove it from anyone's browser: getNotifications() read the stored
 * copy back on every load, forever. It resurfaced weeks later on localhost -
 * an origin whose storage still carried the old injection - and read as "the
 * hestia message has returned" after a clean merge, a clean runtime feed and a
 * clean bundle had all been verified. The last place left was the browser.
 *
 * THE RULE
 * A stored entry in the "Announcements" category only survives if the id is a
 * CURRENTLY KNOWN announcement (bundled or runtime) that is NOT dismissed.
 * Announcements are code/feed-owned content; storage is only a cache of them.
 * "General" entries (order fills, transfers - genuinely user-owned history)
 * are never touched by this rule.
 *
 * Import-free so it is directly unit-testable; getNotifications() applies it.
 */

export type StoredNotificationLike = {
  id: string;
  category?: string;
  [k: string]: unknown;
};

export const pruneStoredNotifications = <T extends StoredNotificationLike>(
  stored: readonly T[] | null | undefined,
  knownAnnouncementIds: readonly string[] | null | undefined,
  dismissedIds: readonly string[] | null | undefined
): T[] => {
  const known = new Set(knownAnnouncementIds ?? []);
  const dismissed = new Set(dismissedIds ?? []);

  return (stored ?? []).filter((n) => {
    if (!n) return false;

    // User-owned history is sacred: never prune General entries here.
    if (n.category !== "Announcements") return true;

    // An announcement id nobody publishes any more is a legacy injection -
    // exactly the Hestia case. Dismissed ids stay gone even if re-published
    // with the same id (ids are the dismissal contract).
    return known.has(n.id) && !dismissed.has(n.id);
  });
};
