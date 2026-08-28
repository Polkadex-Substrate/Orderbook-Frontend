import {
  createStreamErrorLog,
  describeStreamError,
  shouldReportStreamError,
} from "./streamError";

/*
 * Jest globals, matching the rest of this package.
 *
 * ORDERBOOK-TESTNET-B sat untitled for two weeks across nine users because the
 * thing being thrown was a DOM Event, which carries no message. So the tests
 * are built around that exact payload: the value we cannot describe.
 */

/** What Apollo actually passed to observer.error, per the Sentry payload. */
const WEBSOCKET_EVENT = {
  isTrusted: true,
  type: "error",
  target: "[object WebSocket]",
  currentTarget: null,
};

describe("describeStreamError - the payload that defeated Sentry", () => {
  it("names the stream when the error itself says nothing", () => {
    // The whole diagnostic value. "Something failed" was already known; WHICH
    // subscription died is what nobody could see.
    const line = describeStreamError("orderbook", WEBSOCKET_EVENT);
    expect(line).toContain("orderbook");
    expect(line).toMatch(/websocket dropped/i);
  });

  it("never renders an object as [object Object]", () => {
    expect(describeStreamError("balances", WEBSOCKET_EVENT)).not.toContain(
      "[object Object]"
    );
  });

  it("uses a real message when there is one", () => {
    expect(describeStreamError("orders", new Error("connection refused"))).toBe(
      "[orders] subscription error: connection refused"
    );
  });

  it("survives anything, including nothing", () => {
    for (const value of [null, undefined, "", 0, {}, Symbol("x")]) {
      expect(() => describeStreamError("ticker", value)).not.toThrow();
      expect(describeStreamError("ticker", value)).toContain("ticker");
    }
  });
});

describe("shouldReportStreamError - once per stream, not once per drop", () => {
  it("reports the first failure of a stream", () => {
    const log = createStreamErrorLog();
    expect(shouldReportStreamError(log, "orderbook")).toBe(true);
  });

  it("stays quiet for repeats of the same stream", () => {
    // A flapping socket can fail dozens of times a minute. The tenth report
    // tells nobody anything the first did not, and it buries real issues -
    // the same harm the Sentry ignore-list exists to prevent.
    const log = createStreamErrorLog();
    shouldReportStreamError(log, "orderbook");
    for (let i = 0; i < 20; i++) {
      expect(shouldReportStreamError(log, "orderbook")).toBe(false);
    }
  });

  it("keeps streams independent, because which one died is the signal", () => {
    const log = createStreamErrorLog();
    expect(shouldReportStreamError(log, "orderbook")).toBe(true);
    expect(shouldReportStreamError(log, "balances")).toBe(true);
    expect(shouldReportStreamError(log, "orders")).toBe(true);
  });
});
