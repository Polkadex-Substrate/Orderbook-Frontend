import { readFileSync } from "fs";
import { join } from "path";

/*
 * Jest globals, matching the rest of this package.
 *
 * A SOURCE-LEVEL TEST, and deliberately so.
 *
 * What went wrong here cannot be caught by calling a function. Every handler was
 * correct; every subscription was correct; the defect was in eight dependency
 * ARRAYS, which said the socket should be re-created whenever its message
 * handler changed identity. Reproducing that needs a renderer, a websocket and a
 * settings provider all wired together - and this package runs under
 * testEnvironment "node" with no React testing library.
 *
 * So this reads the file and asserts the property directly. It is blunt, and it
 * is the only thing that would have caught the bug. There is precedent in this
 * repo: errorRecovery.test.ts asserts the ABSENCE of an export for the same
 * reason - the failure mode lives in the shape of the code, not in its output.
 *
 * THE BUG. `onOrderUpdates` depends on the toast and notification callbacks from
 * SettingProvider. Those were rebuilt on every render, so pushing a notification
 * changed settings state, re-rendered the provider, gave the handler a new
 * identity, and unsubscribed and resubscribed the very channel that had just
 * delivered the event. Updates arriving in the gap were lost. Reported as: a
 * filled order not showing until you switched tabs and came back, and no fill
 * notification.
 */

const SOURCE = readFileSync(join(__dirname, "provider.tsx"), "utf8");

/** Every dependency array in the file, as written. */
const dependencyArrays = (): string[] => {
  const matches = SOURCE.match(/\}, \[[^\]]*\]\);/g) ?? [];
  return matches.map((m) => m.replace(/\s+/g, " "));
};

/**
 * Handler names that must never appear in a subscription's dependency array.
 *
 * These are the message handlers. A subscription's lifetime depends on what it
 * subscribes TO - an address, a market, readiness - never on the function that
 * processes its messages.
 */
const HANDLERS = [
  "onOrderUpdates",
  "onOrderbookUpdates",
  "onRecentTradeUpdates",
  "onUserTradeUpdate",
  "onTransactionsUpdate",
  "onTickerUpdates",
  "onBalanceUpdate",
  "onAccountsUpdate",
];

describe("subscription lifecycles do not depend on handler identity", () => {
  it("finds the dependency arrays at all", () => {
    // If this fails the regex has drifted and every assertion below is
    // vacuously true, which would be worse than no test.
    expect(dependencyArrays().length).toBeGreaterThanOrEqual(8);
  });

  it("lists no message handler in any dependency array", () => {
    const offenders: string[] = [];
    for (const deps of dependencyArrays()) {
      for (const handler of HANDLERS) {
        // Word boundary: `onOrderUpdatesRef` is the correct thing to depend on,
        // and must not be mistaken for `onOrderUpdates`.
        if (new RegExp(`\\b${handler}\\b`).test(deps)) {
          offenders.push(`${handler} in ${deps}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("reads each handler through a ref instead", () => {
    // The other half of the property. Removing a handler from the deps without
    // routing it through a ref would leave the effect closing over a stale
    // handler forever, which is a worse bug and a silent one.
    for (const handler of HANDLERS) {
      expect({
        handler,
        hasRef: new RegExp(`useLatest\\(${handler}\\)`).test(SOURCE),
      }).toEqual({ handler, hasRef: true });
    }
  });

  it("keeps the subscription deps limited to what they subscribe to", () => {
    // Positive statement of the rule: an address, a market, readiness, and the
    // refs. Anything else creeping in is how this regressed the first time.
    const allowed =
      /^(isReady|market|markets|tradeAddress|mainAddress|queryClient|\w+Ref)$/;
    const offenders: string[] = [];

    for (const deps of dependencyArrays()) {
      const inner = deps.replace(/^\}, \[/, "").replace(/\]\);$/, "");
      if (!/Ref\b/.test(inner)) continue; // not a subscription effect
      for (const name of inner.split(",").map((s) => s.trim())) {
        if (name && !allowed.test(name)) offenders.push(`${name} in ${deps}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
