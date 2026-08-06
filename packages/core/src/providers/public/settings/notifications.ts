import * as T from "./types";

// Change only this to add/delete categories
export const notificationCategories = ["General", "Announcements"] as const;

/**
 * Static announcements injected into every user's notification list.
 *
 * Empty on purpose - runtime JSON is the mechanism now. Post announcements by
 * editing /etc/orderbook-fe/announcements.json on the server; they are served
 * by apps/hestia/src/app/api/announcements/route.ts and need no rebuild.
 *
 * This array still works and is merged with the runtime feed, for anything that
 * genuinely must ship inside the bundle.
 *
 * This held a "Hestia UI Upgrade 🎉" announcement promoting a release that
 * shipped long ago, linking to /trading/PDEXUSDT - a market that does not exist
 * on this network. It was also impossible to get rid of: "Clear" deliberately
 * kept every non-General notification, and deleting it individually removed it
 * from storage, which was exactly the condition getNotifications() used to
 * decide to inject it again. Two separate mechanisms conspired to make the one
 * notification users most wanted gone the only one they could not dismiss.
 *
 * Both are fixed (see helpers.ts), so an entry added here can now be dismissed
 * and stays dismissed. If you add one:
 *
 *   - Use a NEW, unique `id`. Ids are the dismissal key, so reusing an old id
 *     means anyone who dismissed the previous announcement never sees the new
 *     one, and changing an existing entry's text without changing its id
 *     silently updates it for some users and not others.
 *   - Prefer serving announcements from the backend. Anything hardcoded here
 *     needs a full rebuild and redeploy to change or retract, which is a poor
 *     fit for time-sensitive messaging.
 */
export const additionalNotifications: T.Notification[] = [];
