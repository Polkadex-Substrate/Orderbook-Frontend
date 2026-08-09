/**
 * Split the trading accounts into the ones this browser can sign with and the
 * ones it cannot.
 *
 * WHY
 * A trading account is two separate things that are easy to confuse:
 *
 *   1. A PROXY REGISTERED ON CHAIN against the main account. Public, permanent,
 *      readable by anyone, and returned by the chain to every browser.
 *   2. A KEYPAIR IN THIS BROWSER'S KEYRING. Private, local, and present only in
 *      the browser that created or imported it.
 *
 * The app listed (1) and assumed (2). Selecting a proxy whose key is not here
 * produced, at submit time, @polkadot/keyring's own
 * "Unable to retrieve keypair '<address>'" - see localTradingPair.
 *
 * `wallet.getPair` THROWS when the pair is absent, so even MAPPING the list was
 * unsafe: one stale address and the whole `useMemo` threw rather than yielding a
 * shorter list.
 *
 * Import-free so it is testable without a keyring.
 */

export type PairSource<P> = { getPair: (address: string) => P | undefined };

export type AccountSplit<P> = {
  /** Keypairs held in this browser - the only ones that can sign. */
  signable: P[];
  /**
   * Addresses registered on chain but with no key here. Real accounts, real
   * funds, simply not usable from this browser until imported.
   */
  unavailable: string[];
};

/**
 * Resolve each address, keeping what resolves and recording what does not.
 *
 * Never throws: a keyring that raises on a missing pair is the normal case
 * here, not an exceptional one.
 */
export const splitSignableAccounts = <P>(
  addresses: readonly string[] | null | undefined,
  wallet: PairSource<P> | null | undefined
): AccountSplit<P> => {
  const signable: P[] = [];
  const unavailable: string[] = [];

  if (!wallet) return { signable, unavailable: [...(addresses ?? [])] };

  for (const address of addresses ?? []) {
    if (!address) continue;
    let pair: P | undefined;
    try {
      pair = wallet.getPair(address);
    } catch {
      pair = undefined;
    }
    if (pair) signable.push(pair);
    else unavailable.push(address);
  }

  return { signable, unavailable };
};

/**
 * Which on-chain proxies cannot be used from this browser?
 *
 * `proxies` is what the chain reports for the main account; `signableAddresses`
 * is what the keyring actually holds. The difference is what the UI must show
 * as unavailable rather than hide - hiding it would make a user think their
 * account had been deleted, when it is only absent from THIS browser.
 */
export const unavailableProxies = (
  proxies: readonly string[] | null | undefined,
  signableAddresses: readonly string[] | null | undefined
): string[] => {
  const held = new Set(signableAddresses ?? []);
  return (proxies ?? []).filter((address) => !!address && !held.has(address));
};

/** Why a listed account cannot be selected. Shown next to a disabled row. */
export const unavailableReason = (): string =>
  "Registered on chain, but its key is not in this browser. Import it to use this account.";
