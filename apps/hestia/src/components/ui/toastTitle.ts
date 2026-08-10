/**
 * Turn whatever a caller passed as a toast title into a string that is safe to
 * render, and never throw while doing it.
 *
 * THE BUG THIS FIXES (ORDERBOOK-TESTNET-4, 2026-08-10)
 * DynamicProviders did `toast.error(title.toString(), { description })`. An
 * order submission failed with an error carrying no title, so `title` was
 * undefined and `.toString()` threw:
 *
 *     TypeError: Cannot read properties of undefined (reading 'toString')
 *     ./src/components/ui/DynamicProviders/index.tsx:139:35
 *       async onSubmit -> Object.onError -> defaultToast.onError
 *
 * 31 events from one user in eight minutes - they retried, and every retry
 * failed the same way.
 *
 * WHY IT MATTERED MORE THAN A CRASH
 * This is an ERROR HANDLER that crashes. The consequences compound:
 *
 *   1. The user saw no toast at all, so the order looked like it did nothing.
 *   2. The real failure - whatever the exchange actually rejected - was
 *      discarded. It never reached the screen or Sentry.
 *   3. Sentry reported the toast's TypeError instead, which points at the
 *      notification layer and says nothing about the order.
 *
 * So the one code path whose entire job is explaining a failure was destroying
 * the explanation. A guard that silently swallows the empty title would fix the
 * crash and keep consequence 2, which is the expensive one.
 *
 * Hence `toastTitle` returns a usable fallback rather than an empty string, and
 * `describeUnusableTitle` exists so the caller can report that the title was
 * missing WITHOUT losing the original error.
 *
 * Import-free so it is testable without a renderer or a toast library.
 */

/** What the notification layer will actually render. Never empty. */
export const FALLBACK_TITLE = "Something went wrong";

/**
 * Coerce a title of unknown provenance to a non-empty string.
 *
 * Handles, in order of how often each has actually turned up:
 *   - undefined / null            a rejection with no message at all
 *   - Error                       use .message, not the "Error: ..." wrapper
 *   - string                      trimmed; blank counts as absent
 *   - number / boolean / bigint   stringified, INCLUDING 0 and false, which a
 *                                 truthiness check would have dropped
 *   - object                      JSON if it serialises, else the fallback.
 *                                 Never "[object Object]" - that is noise
 *                                 wearing the costume of information.
 */
export const toastTitle = (
  title: unknown,
  fallback: string = FALLBACK_TITLE
): string => {
  if (title === null || title === undefined) return fallback;

  if (title instanceof Error) {
    return title.message?.trim() || fallback;
  }

  if (typeof title === "string") {
    return title.trim() || fallback;
  }

  if (
    typeof title === "number" ||
    typeof title === "boolean" ||
    typeof title === "bigint"
  ) {
    // Number.isNaN(NaN) is the one numeric value worth rejecting: "NaN" on
    // screen is never what anyone meant.
    if (typeof title === "number" && Number.isNaN(title)) return fallback;
    return String(title);
  }

  if (typeof title === "object") {
    // Some wallet and RPC errors arrive as { message } or { reason }.
    const record = title as Record<string, unknown>;
    for (const key of ["message", "reason", "error", "title"]) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    try {
      const json = JSON.stringify(title);
      // "{}" carries no information; treat it as absent.
      return json && json !== "{}" ? json : fallback;
    } catch {
      // Circular structure, or a BigInt inside. Not worth a second attempt.
      return fallback;
    }
  }

  // Symbol, function - nothing sensible to show a user.
  return fallback;
};

/**
 * Was the title unusable, such that the fallback is being shown?
 *
 * The caller uses this to log the ORIGINAL value, so a missing title becomes a
 * reported bug rather than a silently generic toast. Without it, fixing the
 * crash would also hide the fact that some code path is producing titleless
 * errors - which is the thing actually worth fixing upstream.
 */
export const isUnusableTitle = (title: unknown): boolean =>
  toastTitle(title) === FALLBACK_TITLE &&
  !(typeof title === "string" && title.trim() === FALLBACK_TITLE);
