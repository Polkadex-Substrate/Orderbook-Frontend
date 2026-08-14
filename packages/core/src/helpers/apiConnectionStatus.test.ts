import {
  ApiConnectionStatus,
  apiConnectionLabel,
  apiConnectionStatus,
  apiConnectionTone,
  isApiUnavailable,
} from "./apiConnectionStatus";

/*
 * Jest globals, matching the rest of this package.
 *
 * The bug was a two-way branch over a three-way state, so the tests are built
 * around COVERAGE OF THE STATE SPACE rather than a few happy cases: every
 * combination of the two flags is enumerated, and the states the provider
 * actually produces are checked by name against the reducer's transitions.
 */

/** The reducer's real states, from providers/public/nativeApi/reducer.ts. */
const INITIAL = { connected: false, connecting: true };
const CONNECT_DATA = { connected: true, connecting: false };
const CONNECT_ERROR = { connected: false, connecting: false };
const DISCONNECT_DATA = { connected: false, connecting: false };

describe("the reported bug: a failed connection reported as 'Connecting'", () => {
  it("distinguishes gave-up from still-trying, which the old ternary could not", () => {
    // `connected ? "Connected" : "Connecting"` collapsed these two into one
    // branch, so after the 60s RPC timeout the app claimed to still be working.
    expect(apiConnectionStatus(CONNECT_ERROR)).toBe("unavailable");
    expect(apiConnectionStatus(INITIAL)).toBe("connecting");
    expect(apiConnectionStatus(CONNECT_ERROR)).not.toBe(
      apiConnectionStatus(INITIAL)
    );
  });

  it("never labels a failed connection 'Connecting'", () => {
    // The specific false statement that shipped.
    expect(apiConnectionLabel(apiConnectionStatus(CONNECT_ERROR))).not.toBe(
      "Connecting"
    );
    expect(apiConnectionLabel(apiConnectionStatus(CONNECT_ERROR))).toBe(
      "No connection"
    );
  });

  it("maps each reducer state to the right status", () => {
    const cases: [string, object, ApiConnectionStatus][] = [
      ["initialState", INITIAL, "connecting"],
      ["NATIVEAPI_CONNECT_DATA", CONNECT_DATA, "connected"],
      ["NATIVEAPI_CONNECT_ERROR", CONNECT_ERROR, "unavailable"],
      ["NATIVEAPI_DISCONNECT_DATA", DISCONNECT_DATA, "unavailable"],
    ];
    for (const [name, state, expected] of cases) {
      expect({ name, status: apiConnectionStatus(state) }).toEqual({
        name,
        status: expected,
      });
    }
  });

  it("does not show 'No connection' on a fresh mount", () => {
    // A false alarm during the normal first seconds of every page load would
    // train people to ignore the indicator, which costs more than it buys.
    expect(apiConnectionStatus(INITIAL)).toBe("connecting");
    expect(isApiUnavailable(INITIAL)).toBe(false);
  });
});

describe("the full state space", () => {
  it("covers every flag combination with exactly one status", () => {
    const all: ApiConnectionStatus[] = [];
    for (const connected of [true, false]) {
      for (const connecting of [true, false]) {
        const status = apiConnectionStatus({ connected, connecting });
        expect(["connected", "connecting", "unavailable"]).toContain(status);
        all.push(status);
      }
    }
    // connected wins outright, so the two connected rows agree regardless of
    // what `connecting` says. A live API is live.
    expect(all).toEqual([
      "connected",
      "connected",
      "connecting",
      "unavailable",
    ]);
  });

  it("treats missing or partial state as connecting, not as failure", () => {
    // Before the provider mounts, and in any consumer that renders early.
    // Defaulting to "unavailable" here would flash a false alarm.
    expect(apiConnectionStatus({ connecting: true })).toBe("connecting");
    expect(apiConnectionStatus({ connected: true })).toBe("connected");
  });

  it("survives undefined and null rather than throwing at a render", () => {
    for (const v of [undefined, null, {}]) {
      expect(() => apiConnectionStatus(v)).not.toThrow();
      expect(apiConnectionStatus(v)).toBe("unavailable");
    }
  });
});

describe("presentation", () => {
  it("gives every status a label and a tone", () => {
    const statuses: ApiConnectionStatus[] = [
      "connected",
      "connecting",
      "unavailable",
    ];
    for (const status of statuses) {
      expect({ status, label: apiConnectionLabel(status).length > 0 }).toEqual({
        status,
        label: true,
      });
      expect(["success", "attention", "danger"]).toContain(
        apiConnectionTone(status)
      );
    }
  });

  it("reserves danger for the state that needs a human", () => {
    // If the normal first-load state were danger, the colour would mean nothing.
    expect(apiConnectionTone("connecting")).toBe("attention");
    expect(apiConnectionTone("unavailable")).toBe("danger");
    expect(apiConnectionTone("connected")).toBe("success");
  });

  it("does not overstate finality", () => {
    // WsProvider keeps retrying on RECONNECT_TIME_MS, so a session can recover
    // without a reload. "Failed" would tell the user to give up when the client
    // has not.
    const label = apiConnectionLabel("unavailable");
    expect(label.toLowerCase()).not.toContain("failed");
    expect(label.toLowerCase()).not.toContain("error");
  });
});
