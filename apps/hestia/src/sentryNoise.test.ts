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
      "The source https://orderbook-app-test.polkadex.ee/trading/wstETHWETH has not been authorized yet",
    ]) {
      expect(isIgnoredSentryMessage(m)).toBe(false);
    }
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
