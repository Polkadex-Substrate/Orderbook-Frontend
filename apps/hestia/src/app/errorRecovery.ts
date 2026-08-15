/**
 * Deciding what to do with an error that reached the route boundary.
 *
 * THE BUG THIS FIXES
 * After a deploy, a browser holding the previous service worker keeps serving a
 * cached build manifest that names chunk filenames the new build no longer has:
 *
 *   ChunkLoadError: Loading chunk 1370 failed
 *   (.../_next/static/chunks/app/trading/%5Bid%5D/page-66aef840a394f5ae.js)
 *   The FetchEvent for ".../trading/PDEXUSDT" resulted in a network error response
 *
 * `app/error.tsx` then rendered a bare "Something went wrong!" with no retry and
 * no explanation, so a recoverable cache miss became a dead end. Next passes a
 * `reset` callback to that component and it was never used.
 *
 * WHY THIS CLASS DESERVES SPECIAL HANDLING
 * A chunk load failure is not an application bug and retrying the same render
 * cannot fix it: the file genuinely is not there. The only thing that helps is a
 * hard reload, which fetches a current manifest. So this is one of the rare
 * cases where an app should reload itself.
 *
 * WHY THE RELOAD IS GUARDED
 * If the chunk is missing for any reason OTHER than a stale cache - a bad
 * deploy, a CDN gap, an extension blocking the request - reloading produces the
 * same failure, and an unguarded reload is an infinite loop that also erases the
 * console the user needs to report it. So a reload is attempted at most once per
 * session, and after that the user is told plainly.
 *
 * Import-free so the decision is testable without a browser or a renderer.
 */

/** sessionStorage key recording that an auto-reload has already been spent. */
export const RELOAD_ATTEMPT_KEY = "chunk-reload-attempted";

/**
 * Is this the "my cached build is stale" error?
 *
 * Matched on name and message text because webpack does not give it a code.
 * Deliberately narrow: it must not swallow ordinary application errors, which
 * would turn a real bug into a silent reload loop.
 */
export const isChunkLoadError = (error?: unknown): boolean => {
  if (!error) return false;
  const name = (error as { name?: unknown })?.name;
  if (typeof name === "string" && name === "ChunkLoadError") return true;

  const message = (error as { message?: unknown })?.message;
  if (typeof message !== "string" || message.length === 0) return false;
  return (
    /loading chunk \S+ failed/i.test(message) ||
    /loading css chunk/i.test(message) ||
    // Safari and Firefox wording for the same situation.
    /failed to fetch dynamically imported module/i.test(message) ||
    /importing a module script failed/i.test(message)
  );
};

/**
 * Should the app reload itself to pick up a current manifest?
 *
 * @param error           The error that reached the boundary.
 * @param alreadyAttempted Whether a reload has already been spent this session.
 */
export const shouldAutoReload = (
  error: unknown,
  alreadyAttempted: boolean
): boolean => isChunkLoadError(error) && !alreadyAttempted;

export type ErrorCopy = {
  title: string;
  detail: string;
  /** Label for the primary action; the action itself differs by kind. */
  action: string;
};

/**
 * What to tell the user.
 *
 * Two different situations, so two different messages. Telling someone "an
 * update finished downloading" when their app hit a null pointer is a lie, and
 * telling them "something went wrong" when a deploy simply landed under them is
 * needlessly alarming for a financial product.
 */
export const errorCopy = (
  error: unknown,
  alreadyAttempted: boolean
): ErrorCopy => {
  if (isChunkLoadError(error)) {
    return alreadyAttempted
      ? {
          title: "Could not finish loading",
          detail:
            "Part of the app failed to download, and reloading did not help. " +
            "A browser extension or network filter may be blocking it. Try a " +
            "private window, or a different network.",
          action: "Try again",
        }
      : {
          title: "Updating to the latest version",
          detail: "A new version was released. Reloading now.",
          action: "Reload now",
        };
  }
  return {
    title: "Something went wrong",
    detail:
      "This page hit an unexpected error. Trying again often works; if it " +
      "does not, the Report an Issue button sends us the details.",
    action: "Try again",
  };
};
