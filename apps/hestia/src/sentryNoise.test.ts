import { SENTRY_IGNORED_ERRORS, isIgnoredSentryMessage } from "./sentryNoise";

/*
 * The risk with an ignore list is over-matching: silence a real defect and it
 * stops existing as far as anyone can tell. So every test below pairs "drop the
 * noise" with "keep the defect", and the defect cases are drawn from errors this
 * app has actually produced.
 */

describe("drops deliberate user actions", () => {
  it("drops the bare polkadot-js rejection", () => {
    // Sentry POLKADEX-ORDERBOOK-FE-TEST-5, 2 users: a declined signature.
    expect(isIgnoredSentryMessage("Rejected")).toBe(true);
  });

  it("drops wallet-stack rejection wordings", () => {
    for (const m of [
      "User rejected the request.",
      "User rejected request",
      "UserRejectedRequestError: User rejected the request.",
      "MetaMask Tx Signature: User denied transaction signature.",
      "User denied account authorization",
      "Connection request reset. Please try again.",
    ]) {
      expect(isIgnoredSentryMessage(m)).toBe(true);
    }
  });

  it("drops browser/extension teardown noise", () => {
    for (const m of [
      "Extension context invalidated.",
      "The message port closed before a response was received.",
      "Non-Error promise rejection captured with value: undefined",
      "ResizeObserver loop completed with undelivered notifications.",
    ]) {
      expect(isIgnoredSentryMessage(m)).toBe(true);
    }
  });
});

describe("KEEPS real defects - the over-match guard", () => {
  it("keeps the errors this app actually shipped", () => {
    for (const m of [
      // The Passcode crash - the one issue that mattered this week.
      'TypeError: can\'t access property "focus", h.current[0] is undefined',
      // The injectedWeb3 crash.
      "TypeError: Cannot read properties of undefined (reading 'enkrypt')",
      // The engine's own rejection of a bad market config.
      "Bad order: market config invalid",
      // The JSON.parse of a hex reply.
      "Unexpected non-whitespace character after JSON at position 1",
      // RPC and chain failures.
      "FATAL: Unable to initialize the API: No response received from RPC endpoint in 60s",
      "Cannot set property chainId of #<i> which has only a getter",
      // Reown origin rejection. MUST keep reporting: it means wallet connect is
      // dead, which users experience as the whole app being broken - one Ybug
      // report for this was literally "absolutely nothing works".
      //
      // The host used to be orderbook-app-test.polkadex.ee, a DNS alias onto
      // testnet.polkadex.ee. That alias origin is NOT on the Reown allowlist, so
      // anyone arriving on the old link got a closed relay while the canonical
      // host worked fine - same build, same allowlist, different hostname.
      // Asserted against the CANONICAL host now: once the alias 301-redirects the
      // old one can no longer produce this error, and a test pinned to a hostname
      // that cannot fail is a test that has quietly stopped meaning anything.
      "The source https://testnet.polkadex.ee/ has not been authorized yet",
    ]) {
      expect(isIgnoredSentryMessage(m)).toBe(false);
    }
  });

  it("drops 'MetaMask extension not found' - the user has no extension", () => {
    // ORDERBOOK-TESTNET-3. The entire stack is MetaMask's own inpage.js and it
    // arrives handled. Offering a wallet the browser lacks is correct
    // behaviour; the fix belongs in the UI, not in an alert.
    for (const m of [
      "i: Failed to connect to MetaMask",
      "MetaMask extension not found",
    ]) {
      expect(isIgnoredSentryMessage(m)).toBe(true);
    }
  });

  it("still reports a MetaMask error that is NOT about a missing extension", () => {
    // The over-match guard for the two patterns above. A real RPC failure from
    // an installed MetaMask must survive.
    expect(
      isIgnoredSentryMessage("MetaMask JSON-RPC error: internal error")
    ).toBe(false);
  });

  it("does not drop an order that was rejected by the ENGINE", () => {
    // "Rejected" alone is a user choice; an engine rejection is a defect. The
    // anchored regex is what keeps these apart - a substring match would eat both.
    expect(isIgnoredSentryMessage("Order Rejected by matching engine")).toBe(
      false
    );
    expect(isIgnoredSentryMessage("Rejected: insufficient balance")).toBe(
      false
    );
  });

  it("is anchored on the bare rejection, not any mention of the word", () => {
    expect(isIgnoredSentryMessage("Rejected")).toBe(true);
    expect(isIgnoredSentryMessage("Withdrawal Rejected")).toBe(false);
  });
});

describe("the three classes added 2026-08-22", () => {
  it("drops 'Rejected by user' - which the anchored pattern missed", () => {
    // ORDERBOOK-TESTNET-J accrued for days because /^Rejected$/ is anchored and
    // this wording is longer. Anchored patterns are correct AND narrow.
    expect(isIgnoredSentryMessage("Error: Rejected by user")).toBe(true);
    expect(isIgnoredSentryMessage("Rejected by user")).toBe(true);
  });

  it("drops a wallet that exists but was never set up", () => {
    // ORDERBOOK-TESTNET-M, 6 events. The user's Talisman has not completed its
    // own onboarding; nothing in this app can change that.
    expect(
      isIgnoredSentryMessage(
        "Error: Talisman extension has not been configured yet. Please continue with onboarding."
      )
    ).toBe(true);
  });

  it("drops two extensions fighting over the same window property", () => {
    // ORDERBOOK-TESTNET-K. This app never touches window.tron.
    expect(
      isIgnoredSentryMessage(
        "TypeError: Cannot assign to read only property 'tron' of object '#<Window>'"
      )
    ).toBe(true);
    // Any injected global, same collision.
    expect(
      isIgnoredSentryMessage(
        "TypeError: Cannot assign to read only property 'ethereum' of object '#<Window>'"
      )
    ).toBe(true);
  });

  it("still reports a read-only assignment in OUR objects", () => {
    // The pattern is scoped to Window on purpose: a frozen-object bug in app
    // code is a real defect and must stay visible.
    expect(
      isIgnoredSentryMessage(
        "TypeError: Cannot assign to read only property 'status' of object '#<Order>'"
      )
    ).toBe(false);
  });

  it("does not drop a configuration failure of OURS that mentions configured", () => {
    // "has not been configured yet" is broad enough to be worth a guard: an
    // app-side config error must not be swallowed by a wallet-shaped pattern.
    expect(isIgnoredSentryMessage("The RPC endpoint is not configured")).toBe(
      false
    );
  });
});

describe("input handling", () => {
  it("treats absent messages as not-ignored", () => {
    // An event with no message still deserves to be seen.
    expect(isIgnoredSentryMessage(null)).toBe(false);
    expect(isIgnoredSentryMessage(undefined)).toBe(false);
    expect(isIgnoredSentryMessage("")).toBe(false);
  });

  it("every pattern is a string or RegExp (Sentry accepts only these)", () => {
    for (const p of SENTRY_IGNORED_ERRORS) {
      expect(typeof p === "string" || p instanceof RegExp).toBe(true);
    }
  });

  it("has no empty string pattern, which would drop EVERYTHING", () => {
    expect(SENTRY_IGNORED_ERRORS).not.toContain("");
    for (const p of SENTRY_IGNORED_ERRORS) {
      if (typeof p === "string") expect(p.length).toBeGreaterThan(3);
    }
  });
});
