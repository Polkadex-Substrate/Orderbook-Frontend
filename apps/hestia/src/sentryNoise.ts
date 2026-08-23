/**
 * Which client errors are NOT worth an issue?
 *
 * WHY THIS EXISTS
 * The Sentry project accumulated events that are normal user behaviour, not
 * defects - most notably `Error: Rejected`, which is a user declining a wallet
 * signature. Leaving those unresolved trains everyone to skim the issue list,
 * which is how a real bug (the Passcode focus crash, 3 events) sat next to
 * "Rejected" (2 events) with equal visual weight for two days.
 *
 * The rule for adding a pattern here: it must be something the user DID on
 * purpose, or noise the browser generates that no code change can fix. Anything
 * that represents a broken promise to the user stays visible - a rejected
 * signature is a choice, a failed order is a defect.
 *
 * Import-free so it is unit tested directly; instrumentation-client.ts passes
 * the list to Sentry.init({ ignoreErrors }).
 */

/**
 * Patterns passed to Sentry's `ignoreErrors`. Sentry matches these against the
 * event message AND the exception value, substring or regex.
 */
export const SENTRY_IGNORED_ERRORS: (string | RegExp)[] = [
  // ── User declined, in the various wordings the wallet stack produces ──
  // polkadot-js / Talisman / SubWallet surface a bare "Rejected".
  /^Rejected$/,
  // ORDERBOOK-TESTNET-J. `/^Rejected$/` is ANCHORED, so it never matched this
  // longer wording and the issue accrued for days looking like a defect. A
  // lesson about anchored patterns: they are correct and they are narrow, so
  // each new phrasing has to be added deliberately.
  "Rejected by user",
  // wagmi/viem + WalletConnect wordings.
  "User rejected the request",
  "User rejected request",
  "UserRejectedRequestError",
  "User denied transaction signature",
  "User denied account authorization",
  // The user closed the wallet modal instead of choosing.
  "Connection request reset",
  "Modal closed by user",

  // ── Wallet not installed ──
  // "MetaMask extension not found", surfacing as "Failed to connect to
  // MetaMask". Added 2026-08-10 after ORDERBOOK-TESTNET-3: a user without the
  // extension clicked the MetaMask option. The whole stack is MetaMask's own
  // injected `scripts/inpage.js`, not ours, and it arrives `handled: true`.
  //
  // Not a defect and nothing to fix in code - the connector list offers wallets
  // the browser may not have, which is correct. What SHOULD change is the UI
  // telling the user the extension is missing; a Sentry event does not.
  "MetaMask extension not found",
  "Failed to connect to MetaMask",

  // ── Wallet installed but not set up ──
  // ORDERBOOK-TESTNET-M, 6 events across / and /trading. Talisman is installed
  // and has never been through its own onboarding, so it refuses to answer. The
  // same category as "not installed": a state of the user's wallet, which no
  // change to this app can alter.
  //
  // What SHOULD change is the UI - offering a wallet that cannot respond, then
  // saying nothing useful, is a UX gap. A Sentry issue does not fix it, and
  // leaving it in the error stream buries the events that are ours.
  "has not been configured yet",
  "Please continue with onboarding",

  // ── Browser/extension noise no app change can fix ──
  // Chrome extensions tearing down a port during navigation.
  "Extension context invalidated",
  "The message port closed before a response was received",
  // Safari/iOS non-error rejections that carry no stack.
  "Non-Error promise rejection captured",
  // ResizeObserver's benign loop warning, reported as an error by some browsers.
  /ResizeObserver loop/,
  // ORDERBOOK-TESTNET-K: "Cannot assign to read only property 'tron' of object
  // '#<Window>'". Two crypto extensions both claiming `window.tron`; the second
  // one loses because the first defined it non-writable. Entirely between the
  // two extensions - this app never touches `window.tron` - and it fires on
  // every page load for anyone with that pair installed.
  //
  // Scoped to the property collision on Window rather than a blanket
  // "read only property", so a genuine frozen-object bug in our own code would
  // still be reported.
  /Cannot assign to read only property '\w+' of object '#<Window>'/,
];

/**
 * Would this message be dropped?
 *
 * Mirrors Sentry's substring-or-regex semantics so the list can be tested
 * without booting the SDK. Exported for the tests and for local debugging.
 */
export const isIgnoredSentryMessage = (
  message: string | null | undefined,
  patterns: (string | RegExp)[] = SENTRY_IGNORED_ERRORS
): boolean => {
  if (!message) return false;
  return patterns.some((p) =>
    typeof p === "string" ? message.includes(p) : p.test(message)
  );
};
