import {
  classifyEmptyFailure,
  createFailureLog,
  shouldReportFailure,
} from "./graphqlFailure";

/*
 * Ground truth, measured on testnet: GetMarketTickers failed ~20 times in the
 * first three seconds, every time with both Apollo error buckets empty, and the
 * only thing the log could say was "check the endpoint URL, CORS, and that a
 * transport exists". Three candidate causes, no way to choose between them, and
 * the issue open since November.
 *
 * These tests exist to prove the three are now distinguishable.
 */

const base = {
  operationName: "GetMarketTickers",
  hadData: false,
  operationType: "query" as const,
  hasWsLink: true,
};

describe("classifyEmptyFailure - three causes that used to look identical", () => {
  it("calls a cancelled request cancelled, and does NOT report it", () => {
    // The likeliest explanation for a burst that stops once the page settles:
    // unmounts, navigation, aborted refetches. Reporting these would recreate
    // ORDERBOOK-TESTNET-D - a channel full of events meaning "the user moved".
    const v = classifyEmptyFailure({ ...base, httpStatus: null });
    expect(v.cause).toBe("aborted");
    expect(v.worthReporting).toBe(false);
    expect(v.message).toMatch(/cancelled/i);
  });

  it("treats undefined status the same as null", () => {
    expect(classifyEmptyFailure({ ...base, httpStatus: undefined }).cause).toBe(
      "aborted"
    );
  });

  it("names a 200 with an empty body as the server's problem", () => {
    // Invisible from the frontend without printing the status, which the old
    // message never did.
    const v = classifyEmptyFailure({ ...base, httpStatus: 200 });
    expect(v.cause).toBe("empty-response");
    expect(v.worthReporting).toBe(true);
    expect(v.message).toContain("200");
    expect(v.message).toMatch(/no data and no errors/i);
    // Must NOT claim the body was empty. That wording shipped once, built from
    // `context.response.data` - a field that does not exist on a fetch Response,
    // so it was always undefined. Three issues asserted it on no evidence.
    expect(v.message).not.toMatch(/empty body/i);
  });

  it("does not call it empty when data actually arrived", () => {
    const v = classifyEmptyFailure({ ...base, httpStatus: 200, hadData: true });
    expect(v.cause).toBe("unknown");
  });

  it("catches a subscription with no websocket link", () => {
    // The one case the original "check that a transport exists" wording was
    // really about. A deployment problem, and it should page someone.
    const v = classifyEmptyFailure({
      ...base,
      operationName: "OnOrderUpdate",
      operationType: "subscription",
      hasWsLink: false,
      httpStatus: null,
    });
    expect(v.cause).toBe("no-transport");
    expect(v.worthReporting).toBe(true);
    expect(v.message).toMatch(/websocket/i);
  });

  it("does not blame the transport when a websocket link exists", () => {
    const v = classifyEmptyFailure({
      ...base,
      operationType: "subscription",
      hasWsLink: true,
      httpStatus: null,
    });
    expect(v.cause).toBe("aborted");
  });

  it("always names the operation, whatever the cause", () => {
    for (const status of [null, 200, 204, 418]) {
      expect(
        classifyEmptyFailure({ ...base, httpStatus: status }).message
      ).toContain("GetMarketTickers");
    }
  });

  it("never invents a cause it cannot support", () => {
    // A status outside the success range with no error buckets is genuinely
    // strange. Saying "unknown" and printing the facts beats guessing.
    const v = classifyEmptyFailure({ ...base, httpStatus: 418 });
    expect(v.cause).toBe("unknown");
    expect(v.message).toContain("418");
  });
});

describe("shouldReportFailure - twenty events, one signal", () => {
  it("reports the first occurrence", () => {
    const log = createFailureLog();
    expect(shouldReportFailure(log, "GetMarketTickers", "empty-response")).toBe(
      true
    );
  });

  it("stays quiet for the other nineteen", () => {
    const log = createFailureLog();
    shouldReportFailure(log, "GetMarketTickers", "empty-response");
    for (let i = 0; i < 19; i++) {
      expect(
        shouldReportFailure(log, "GetMarketTickers", "empty-response")
      ).toBe(false);
    }
  });

  it("still speaks up when the SAME operation fails a NEW way", () => {
    // A query that goes from "cancelled" to "empty response" has changed
    // meaning, and collapsing those would hide the transition.
    const log = createFailureLog();
    shouldReportFailure(log, "GetMarketTickers", "aborted");
    expect(shouldReportFailure(log, "GetMarketTickers", "empty-response")).toBe(
      true
    );
  });

  it("keeps operations independent", () => {
    const log = createFailureLog();
    shouldReportFailure(log, "GetMarketTickers", "empty-response");
    expect(shouldReportFailure(log, "GetOrderbook", "empty-response")).toBe(
      true
    );
  });
});
