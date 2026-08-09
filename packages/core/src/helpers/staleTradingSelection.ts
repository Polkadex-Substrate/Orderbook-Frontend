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

  // A null/undefined list is "unknown", not "empty". Only an actual array -
  // even an empty one - is evidence, and only once `ready`.
  if (!Array.isArray(signableAddresses)) return false;

  return !held.includes(selected);
};

/** What to tell the user when the remembered account is dropped. */
export const staleSelectionMessage = (): string =>
  "Your trading account was deselected because its key is not in this browser. Select or import a trading account to place orders.";
