import { errorMessage } from "../../../helpers/errorMessage";

/**
 * Describing a websocket subscription failure, and reporting it at most once.
 *
 * THE BUG THIS FIXES: ORDERBOOK-TESTNET-B, ten events across NINE users, open
 * since 13 August with the title `<unknown>` because nobody could work out what
 * it was. The payload finally gave it away:
 *
 *     "target": "[object WebSocket]", "type": "error"
 *     mechanism: onunhandledrejection, handled: no
 *
 * A raw DOM `Event` - not an Error - arriving as an UNHANDLED PROMISE
 * REJECTION. Sentry cannot derive a title from an Event, which is exactly why
 * the issue sat untitled and unread for two weeks while nine people hit it.
 *
 * WHERE IT COMES FROM
 * Every subscription in this file ends with `observable.subscribe(cb)` - a
 * single `next` callback and NO error callback. When the socket drops, Apollo
 * calls `observer.error(event)`, RxJS finds no error handler, and rethrows
 * asynchronously. That becomes an unhandled rejection carrying the WebSocket
 * error Event.
 *
 * A dropped socket is an ordinary event on a testnet with one RPC endpoint and
 * no fallback. It should produce a log line and, at most, one report - not an
 * unhandled rejection per occurrence per stream.
 *
 * WHY REPORT AT ALL, IF IT IS ORDINARY
 * Because "the orderbook stopped updating" is invisible otherwise: the socket
 * dies, the UI keeps showing the last data it had, and nothing says so. One
 * report per stream per session is the difference between diagnosing that in
 * minutes and never seeing it.
 *
 * Import-free apart from errorMessage, so both rules are testable without a
 * socket.
 */

/** Caller-owned set of stream labels already reported this session. */
export type StreamErrorLog = Set<string>;

export const createStreamErrorLog = (): StreamErrorLog => new Set();

/**
 * A human-readable line for a stream failure.
 *
 * The label matters more than the error: a WebSocket error Event carries almost
 * nothing, so "which subscription died" is the entire diagnostic value. Naming
 * the stream is what turns `<unknown>` into something actionable.
 */
export const describeStreamError = (label: string, error: unknown): string => {
  const detail = errorMessage(error);
  // A bare DOM Event yields "" from errorMessage - deliberately, since
  // "[object Event]" is noise. Say what we DO know instead.
  return detail
    ? `[${label}] subscription error: ${detail}`
    : `[${label}] subscription closed unexpectedly (no error detail - usually the websocket dropped)`;
};

/**
 * Should this stream's failure be reported? True once per label per session.
 *
 * Per LABEL, not per occurrence: a flapping connection can fail dozens of times
 * a minute, and the tenth report tells nobody anything the first did not.
 */
export const shouldReportStreamError = (
  log: StreamErrorLog,
  label: string
): boolean => {
  if (log.has(label)) return false;
  log.add(label);
  return true;
};
