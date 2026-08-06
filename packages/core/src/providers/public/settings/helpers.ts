import { additionalNotifications } from "./notifications";
import * as T from "./types";
import * as C from "./constants";

export const selectNotifications = (
  allNotifications: T.Notification[]
): T.Notification[] => allNotifications?.sort((a, b) => b.date - a.date);

export const selectNotificationsAlert = (
  allNotifications: T.Notification[]
): T.Notification[] =>
  allNotifications
    ?.sort((a, b) => a.date - b.date)
    .filter((value) => !value.active);

/**
 * Ids of static announcements the user has dismissed.
 *
 * Announcements live in code (see ./notifications.ts) rather than in storage,
 * so getNotifications() has to decide each load whether to inject them. It used
 * "is this id absent from localStorage?" as the test - but a *deleted*
 * announcement is also absent, so deleting one re-injected it on the next read.
 * Dismissal has to be recorded somewhere it cannot be confused with never
 * having been seen.
 */
const getDismissedAnnouncements = (): string[] => {
  try {
    const raw = localStorage.getItem(C.DISMISSEDANNOUNCEMENTSNAME);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Corrupt value: treat as "nothing dismissed" rather than throwing inside a
    // reducer, which would take the whole settings provider down.
    return [];
  }
};

const dismissAnnouncements = (ids: string[]) => {
  if (!ids.length) return;
  const next = Array.from(new Set([...getDismissedAnnouncements(), ...ids]));
  localStorage.setItem(C.DISMISSEDANNOUNCEMENTSNAME, JSON.stringify(next));
};

/**
 * Announcements fetched from /api/announcements at runtime.
 *
 * Module-level rather than passed through every call because getNotifications()
 * is invoked from inside the reducer, which has no access to component state.
 * The reducer already performs localStorage side effects, so this is consistent
 * with how the rest of this module works.
 */
let remoteAnnouncements: T.Notification[] = [];

export const setRemoteAnnouncements = (list: T.Notification[]) => {
  remoteAnnouncements = list;
};

/**
 * Every announcement the client knows about, from code and from the API.
 *
 * Both sources need the same treatment: injected on read, dismissible by id.
 * `additionalNotifications` is empty by default now - runtime JSON is the
 * intended mechanism - but it still works for anything that must ship with the
 * bundle.
 */
const allAnnouncements = (): T.Notification[] => [
  ...additionalNotifications,
  ...remoteAnnouncements,
];

const isAnnouncementId = (id: string) =>
  allAnnouncements().some((n) => n.id === id);

export const getNotifications = (): T.Notification[] => {
  let localNotifications: T.Notification[] =
    JSON.parse(localStorage.getItem(C.DEFAULTNOTIFICATIONNAME) as string) || [];

  localNotifications = localNotifications
    .filter((e) => e.message && e.category && e.description)
    ?.sort((a, b) => b.date - a.date);

  const dismissed = getDismissedAnnouncements();
  const seen = new Set(localNotifications.map((n) => n.id));

  const filteredAdditionalNotifications = allAnnouncements().filter(
    (e) => !seen.has(e.id) && !dismissed.includes(e.id)
  );

  return filteredAdditionalNotifications.concat(localNotifications);
};

export const setNotifications = (notifications: T.Notification[]) => {
  localStorage.setItem(
    C.DEFAULTNOTIFICATIONNAME,
    JSON.stringify(notifications)
  );
};

/**
 * Remove one notification, permanently.
 *
 * Filtering storage is not enough for an announcement - it is injected from
 * code, so it has to be recorded as dismissed too or it returns on next read.
 */
export const removeNotificationById = (
  // `number | string` because that is what the NOTIFICATION_DELETE_BY_ID action
  // declares, even though Notification.id is a string. Normalised once here so
  // the comparison below cannot silently miss on a type mismatch.
  rawId: number | string
): T.Notification[] => {
  const id = String(rawId);
  if (isAnnouncementId(id)) dismissAnnouncements([id]);
  const remaining = getNotifications().filter((e) => String(e.id) !== id);
  setNotifications(remaining);
  return remaining;
};

/**
 * "Clear all" - and it now genuinely clears all.
 *
 * This used to keep everything whose category was not "General":
 *
 *   getNotifications().filter((e) => e.category !== "General")
 *
 * "Announcements" is the only other category in use, and its only member was a
 * hardcoded announcement - so the carve-out did nothing except make the one
 * notification a user most wanted rid of the one thing Clear could not touch.
 * Combined with the re-injection above, it was unremovable by any route in the
 * UI.
 */
export const removeAllNotifications = () => {
  dismissAnnouncements(allAnnouncements().map((n) => n.id));
  setNotifications([]);
};
