/**
 * Is the remembered trading account one this browser can no longer sign with?
 *
 * WHY
 * The picker now only offers signable accounts, and lists the rest greyed out.
 * But the SELECTION is persisted (LOCAL_STORE.lastUsedAccount) and survives the
 * key going away - a different browser profile, cleared site data, an account
 * removed from the device. The stored address is then still handed to
 * useCreateOrder, useWithdraw and the cancel hooks, which sign with it, and the
 * user meets the keyring error at submit even though the account is nowhere in
 * the UI they were offered.
 *
 * Clearing it is the honest resolution: the app falls back to "no trading
 * account selected" and prompts to connect one, which is a state the UI already
 * handles well.
 *
 * THE TIMING IS THE WHOLE DIFFICULTY. The keyring loads asynchronously, so for
 * the first render or two `signableAddresses` is legitimately empty. Dropping
 * the selection then would log every user out of their trading account on every
 * page load - a far worse bug than the one being fixed. Hence `ready`, which
 * the caller must only set once the keyring has actually finished loading.
 *
 * Import-free so the timing rules are testable without a keyring or a renderer.
 */

export type StaleSelectionInput = {
  /** The remembered trading address, from persisted state. */
  selected: string | null | undefined;
  /** The connected extension account, which signs without a local keypair. */
  extensionAddress?: string | null;
  /** Addresses whose keypair this browser actually holds. */
  signableAddresses: readonly string[] | null | undefined;
  /** Has the keyring finished loading? Nothing is decided before this. */
  ready: boolean;
};

/**
 * True only when the remembered account definitely cannot sign here.
 *
 * Deliberately conservative: every uncertain case returns false and leaves the
 * selection alone. A wrong `true` signs the user out; a wrong `false` costs one
 * clear error message at submit, which now exists.
 */
export const isStaleTradingSelection = ({
  selected,
  extensionAddress,
  signableAddresses,
  ready,
}: StaleSelectionInput): boolean => {
  // Nothing selected: nothing to drop.
  if (!selected) return false;

  // The keyring has not loaded. Its emptiness means "not yet", not "gone".
  if (!ready) return false;

  // The extension signs for itself; it needs no entry in the local keyring.
  if (extensionAddress && selected === extensionAddress) return false;

  const held = signableAddresses ?? [];

  // A null/undefined list is "unknown", not "empty".
  if (!Array.isArray(signableAddresses)) return false;

  /*
   * AN EMPTY ARRAY IS NOT EVIDENCE EITHER. This line is here because production
   * disproved the assumption the rest of this function was built on.
   *
   * The original reasoning was: `ready` guarantees the keyring has finished
   * loading, so an empty list once ready means the user genuinely holds no keys.
   * A test asserted exactly that. ORDERBOOK-TESTNET-G says otherwise:
   *
   *     ready: true
   *     signableCount: 0
   *     emptySignableList: true
   *     hasExtensionAddress: false
   *
   * Three events, two users, on /bridge. Note that the EXTENSION address was
   * missing at the same moment. Both the keyring and the extension being empty
   * at once is not a user with no accounts - it is a provider that has reported
   * `isReady` before either finished populating. So `ready` does not mean what
   * this function needed it to mean, and no amount of care inside this function
   * could have known that from one render.
   *
   * The matching symptom: "keeps asking for connect to trading account, have to
   * disconnect the wallet and connect it back". A genuinely absent key does not
   * come back when you reconnect a wallet. A prematurely empty list does.
   *
   * So a selection is now dropped only on POSITIVE evidence: we can see keys,
   * and the remembered one is not among them. With no keys visible we cannot
   * tell "none" from "not yet", so we leave it alone.
   *
   * WHAT THIS COSTS. A user who genuinely holds zero keys keeps a dangling
   * selection and meets the keyring error at submit instead. That trade was
   * already stated in this file's original reasoning and it still holds: "a
   * wrong `true` signs the user out; a wrong `false` costs one clear error
   * message at submit, which now exists". This makes wrong `true` much rarer at
   * the price of a slightly more common wrong `false`.
   */
  if (held.length === 0) return false;

  return !held.includes(selected);
};

/** What to tell the user when the remembered account is dropped. */
export const staleSelectionMessage = (): string =>
  "Your trading account was deselected because its key is not in this browser. Select or import a trading account to place orders.";

/**
 * Facts to report when a selection is dropped, so we can tell a correct drop
 * from a spurious one.
 *
 * THE OPEN REPORT THIS IS FOR
 * "Now also keeps asking for connect to trading account. Have to disconnect the
 * wallet and connect it back." Repeatedly, in one session. That is the shape of
 * a spurious drop, not a genuinely missing key: a missing key does not come back
 * when you reconnect a wallet.
 *
 * The likeliest mechanism is a transient empty signable list while `ready` is
 * already true - the keyring finishing, re-initialising, or the provider
 * remounting. `isStaleTradingSelection` cannot distinguish that from a real
 * absence, because from inside one render they look identical. Only the sequence
 * over time tells them apart, so the sequence is what gets reported.
 *
 * NO ADDRESSES. Counts and booleans only. Which accounts a person holds is not
 * needed to answer this question, so it is not collected.
 */
export const staleSelectionReport = ({
  extensionAddress,
  signableAddresses,
  ready,
}: StaleSelectionInput): Record<string, unknown> => ({
  ready,
  signableCount: Array.isArray(signableAddresses)
    ? signableAddresses.length
    : null,
  hasExtensionAddress: !!extensionAddress,
  // The telling case: ready, a selection held, and NOTHING signable. A real
  // stale selection usually coexists with other signable accounts; an empty
  // list right after ready is much more likely to be a timing artefact.
  emptySignableList:
    Array.isArray(signableAddresses) && signableAddresses.length === 0,
});
