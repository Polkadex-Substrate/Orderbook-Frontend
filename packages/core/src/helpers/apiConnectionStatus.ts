/**
 * The chain connection has three states. The UI was rendering two.
 *
 * THE BUG THIS FIXES
 * Sentry, three occurrences, all iOS:
 *
 *   FATAL: Unable to initialize the API: No response received from RPC endpoint in 60s
 *
 * `NativeApiProvider` already handles this correctly. It catches the unowned
 * promise rejection and dispatches NATIVEAPI_CONNECT_ERROR, which leaves state as
 * `{ connected: false, connecting: false }`. The failure is known.
 *
 * The only place that state reached a user was the footer, which read:
 *
 *     {connected ? "Connected" : "Connecting"}
 *
 * A two-way branch over a three-way state. "We gave up after 60 seconds" and "we
 * are still trying" both fall into the same else, so the app told the user it was
 * CONNECTING when it had already stopped. That is worse than saying nothing: a
 * spinner asks for patience, and patience was not going to help.
 *
 * On a phone it was not even visible. The footer is only `fixed bottom-0` when
 * `!mobileView`, so on mobile it sits in normal flow at the end of the document
 * and a user on /trading never scrolls to it. Hence a report reading
 * "absolutely nothing working" rather than "it says it cannot connect".
 *
 * WHY A MODULE RATHER THAN A TERNARY
 * Because the bug WAS a ternary. The property that matters is that every state
 * maps to exactly one status and that no state falls through to a default, and
 * that is a property worth asserting in a test rather than re-deriving at each
 * call site. Import-free so it is testable without a renderer.
 *
 * A NOTE ON THE 60 SECONDS
 * That timeout is @polkadot/api's own, not ours, and this module does not change
 * it. What it changes is that the minute is no longer silent, and that the state
 * after it is stated honestly.
 */

export type ApiConnectionStatus = "connected" | "connecting" | "unavailable";

export type ApiConnectionState = {
  connected?: boolean;
  connecting?: boolean;
};

/**
 * Reduce the provider's flags to one status.
 *
 * `connected` wins outright: if the API is live, nothing else matters. Otherwise
 * `connecting` distinguishes an attempt still in flight from one that has ended
 * without success, and that distinction is the entire point of this function.
 */
export const apiConnectionStatus = (
  state?: ApiConnectionState | null
): ApiConnectionStatus => {
  if (state?.connected) return "connected";
  if (state?.connecting) return "connecting";
  // Not connected and not trying. Either the 60s bootstrap failed or the socket
  // dropped. Both are "the chain is not reachable right now" to a user.
  return "unavailable";
};

/**
 * What to show the user.
 *
 * "No connection" rather than "Disconnected" or "Error": it describes the user's
 * situation instead of the client's internal state, and it does not imply they
 * did something. It is also deliberately not "Failed" - WsProvider keeps
 * retrying on RECONNECT_TIME_MS and a session can recover without a reload, so
 * saying "failed" would overstate how final this is.
 */
export const apiConnectionLabel = (status: ApiConnectionStatus): string => {
  if (status === "connected") return "Connected";
  if (status === "connecting") return "Connecting";
  return "No connection";
};

/**
 * Severity, for whatever renders it.
 *
 * "connecting" is attention rather than danger because it is the normal state
 * for the first seconds of every page load. Reserving danger for the state that
 * actually needs a human keeps the signal meaningful.
 */
export const apiConnectionTone = (
  status: ApiConnectionStatus
): "success" | "attention" | "danger" => {
  if (status === "connected") return "success";
  if (status === "connecting") return "attention";
  return "danger";
};

/** Is the chain unreachable right now? The case the old UI could not express. */
export const isApiUnavailable = (state?: ApiConnectionState | null): boolean =>
  apiConnectionStatus(state) === "unavailable";
