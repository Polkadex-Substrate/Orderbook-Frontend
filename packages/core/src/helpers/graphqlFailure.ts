/**
 * Making a GraphQL failure that carries no error legible.
 *
 * THE BUG THIS DIAGNOSES
 * `GetMarketTickers` failed about twenty times in the first three seconds of a
 * page load, every time with neither `graphQLErrors` nor `networkError`
 * populated. Our error link said so honestly:
 *
 *   [GraphQL] GetMarketTickers failed with no graphQLErrors and no networkError
 *   - check the endpoint URL, CORS, and that a transport exists for this
 *     operation type.
 *
 * and that was the end of the trail. Every market on the trading page rendered
 * volume 0 and change "-" as a result (see helpers/tickerBatch.ts), and the
 * cause has been open since November.
 *
 * WHY THE MESSAGE WAS A DEAD END
 * It listed three possible causes and gave no way to choose between them. Both
 * Apollo buckets being empty is not one failure, it is several:
 *
 *   - HTTP 200 with `data: null` and no `errors` array. The server answered and
 *     said nothing. A backend problem.
 *   - The operation was ABORTED - unmount, navigation, or a cancelled
 *     react-query fetch. Not a failure at all, and reporting it is noise. This
 *     is the likeliest explanation for a burst that stops once the page settles.
 *   - No transport for the operation type: a subscription with no websocket
 *     link. A configuration problem.
 *
 * These need different owners and different fixes, so the log line has to name
 * which one happened. The HTTP status - which Apollo puts on the operation
 * context and the old code never read - separates all three.
 *
 * Import-free and pure: `classifyEmptyFailure` takes the facts and returns a
 * verdict, so each branch is testable without a server.
 */

export type EmptyFailureFacts = {
  /** Operation name, or "unknown operation". */
  operationName: string;
  /** HTTP status from the operation context, when there was a response. */
  httpStatus?: number | null;
  /** Did the response carry a data object at all? */
  hadData: boolean;
  /** Operation type, which decides which transport should have handled it. */
  operationType?: "query" | "mutation" | "subscription" | null;
  /** Was a websocket link configured? Subscriptions need one. */
  hasWsLink?: boolean;
};

export type EmptyFailureVerdict = {
  /** Sentry/console message. Groups by cause, not by operation. */
  message: string;
  /** Machine-readable cause, for the `extra` payload. */
  cause: "aborted" | "empty-response" | "no-transport" | "unknown";
  /** Should this reach Sentry, or is it ordinary lifecycle noise? */
  worthReporting: boolean;
};

export const classifyEmptyFailure = ({
  operationName,
  httpStatus,
  hadData,
  operationType,
  hasWsLink,
}: EmptyFailureFacts): EmptyFailureVerdict => {
  /*
   * A subscription with no websocket link never had anywhere to go. This is the
   * one case the original message's "check that a transport exists" wording was
   * actually about, and it is a deployment problem worth an alert.
   */
  if (operationType === "subscription" && hasWsLink === false)
    return {
      message: `[GraphQL] ${operationName} could not run: no websocket link is configured for subscriptions`,
      cause: "no-transport",
      worthReporting: true,
    };

  /*
   * No HTTP response at all, and it was not a network error either. The request
   * was cancelled before it completed - a component unmounted, the route
   * changed, or react-query aborted a stale fetch.
   *
   * NOT REPORTED, deliberately. React 18's strict-mode double-invoke and
   * ordinary navigation both produce these in bursts, and a reporter that fires
   * on them recreates ORDERBOOK-TESTNET-D: a channel full of events that mean
   * "the user moved". It is still logged, because a burst of them is a useful
   * thing to SEE while debugging, just not to be paged about.
   */
  if (httpStatus === null || httpStatus === undefined)
    return {
      message: `[GraphQL] ${operationName} was cancelled before a response arrived (navigation, unmount, or an aborted refetch)`,
      cause: "aborted",
      worthReporting: false,
    };

  /*
   * The server answered, successfully, with nothing in it. A 200 carrying
   * neither data nor errors is the backend's bug, and it is invisible from the
   * frontend without printing the status.
   */
  if (httpStatus >= 200 && httpStatus < 300 && !hadData)
    return {
      /*
       * WORDING MATTERS HERE, AND THE FIRST VERSION OVERSTATED THE CASE.
       *
       * It said "the server answered with an empty body", which was read off
       * `operation.getContext().response.data` - a field that does not exist on
       * a fetch Response, so it was always undefined. Three Sentry issues went
       * out asserting an empty body on evidence that had never been collected,
       * and a note nearly went to the backend team on that basis.
       *
       * `hadData` is now read from the GraphQL ExecutionResult, so the claim is
       * supported. The message still says only what is measured: a 2xx, no data,
       * and neither error bucket. It does NOT speculate about the body bytes.
       */
      message: `[GraphQL] ${operationName} returned HTTP ${httpStatus} with no data and no errors`,
      cause: "empty-response",
      worthReporting: true,
    };

  return {
    message: `[GraphQL] ${operationName} failed with no errors of either kind (HTTP ${httpStatus}, data ${hadData ? "present" : "absent"})`,
    cause: "unknown",
    worthReporting: true,
  };
};

/**
 * Report each cause at most once per operation per session.
 *
 * Twenty identical events tell nobody anything the first did not, and burying
 * the signal is the failure mode the Sentry ignore-list already exists to
 * prevent. Keyed on operation AND cause so a query that changes failure mode
 * still gets heard.
 */
export type FailureLog = Set<string>;
export const createFailureLog = (): FailureLog => new Set();

export const shouldReportFailure = (
  log: FailureLog,
  operationName: string,
  cause: string
): boolean => {
  const key = `${operationName}:${cause}`;
  if (log.has(key)) return false;
  log.add(key);
  return true;
};
