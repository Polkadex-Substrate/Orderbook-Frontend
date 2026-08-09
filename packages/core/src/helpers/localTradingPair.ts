/**
 * Look up the local keypair for a trading account without exploding.
 *
 * THE REPORT
 * Selling USDC produced:
 *
 *   Unable to retrieve keypair
 *   'esq2MfBtGU9n1bq1tPCeRCZ5ZoKDEV82HPDTmxpAkBajqx7fP'
 *
 * That is @polkadot/keyring's internal message, raised verbatim to the user. It
 * names an address they never typed, explains nothing, and suggests no action.
 *
 * WHY THE EXISTING GUARD NEVER FIRED
 * Four hooks - createOrder, cancelOrder, cancelAllOrders, withdraw - all do:
 *
 *   const keyringPair = wallet.getPair(tradeAddress);
 *   if (!keyringPair) throw new Error("Invalid trading account");
 *
 * `wallet.getPair` delegates to `keyring.getPair`, and polkadot's implementation
 * THROWS when the pair is absent rather than returning undefined:
 *
 *   get(address) {
 *     const pair = this.#map[decodeAddress(address).toString()];
 *     if (!pair) throw new Error(`Unable to retrieve keypair '...'`);
 *     return pair;
 *   }
 *
 * So the `if (!keyringPair)` line is unreachable in all four hooks - dead code
 * that reads like a guard. The raw error escapes to `onError` and out to a
 * toast.
 *
 * WHAT IT ACTUALLY MEANS
 * The trading account is registered on-chain as a proxy of the main account, so
 * the app lists it and lets it be selected - but its keypair lives only in the
 * browser that created it. A different browser, a different profile, or cleared
 * site data all produce this. Nothing is lost on-chain; the account simply
 * cannot sign here until it is imported again.
 *
 * Import-free so it is testable without a keyring.
 */

export type PairLookup<P> =
  | { ok: true; pair: P }
  | { ok: false; reason: "missing" | "locked"; message: string };

/**
 * The narrow slice of the wallet this needs.
 *
 * `P | undefined` because the real signature is
 * `getPair(address): KeyringPair | undefined` - even though the implementation
 * throws instead of ever returning undefined. Declaring it honestly lets the
 * generic infer the caller's own KeyringPair rather than collapsing to the
 * constraint, which is what made `signPayload(api, lookup.pair, ...)` reject.
 */
export type PairSource<P> = { getPair: (address: string) => P | undefined };

const truncate = (address: string): string =>
  address.length > 12
    ? `${address.slice(0, 6)}...${address.slice(-6)}`
    : address;

/**
 * Resolve the keypair for a trading account, converting every failure mode into
 * something a user can act on.
 *
 * `locked` is reported separately because the remedy is different and much
 * smaller: enter the password, versus re-import the account.
 */
export const localTradingPair = <P extends { isLocked?: boolean }>(
  wallet: PairSource<P> | null | undefined,
  tradeAddress: string | null | undefined
): PairLookup<P> => {
  if (!wallet)
    return {
      ok: false,
      reason: "missing",
      message: "Your wallet is not ready yet. Wait a moment and try again.",
    };

  if (!tradeAddress)
    return {
      ok: false,
      reason: "missing",
      message: "No trading account is selected.",
    };

  let pair: P | undefined;
  try {
    pair = wallet.getPair(tradeAddress);
  } catch {
    // polkadot's keyring throws rather than returning undefined. Swallowing the
    // original message is deliberate: it names a raw address and nothing else.
    pair = undefined;
  }

  if (!pair)
    return {
      ok: false,
      reason: "missing",
      message: `Trading account ${truncate(
        tradeAddress
      )} is not available in this browser. Its key is stored locally, so it will not be here if you have switched browser or profile, or cleared site data. Import the account again, or pick a different trading account.`,
    };

  if (pair.isLocked)
    return {
      ok: false,
      reason: "locked",
      message: "Please unlock your trading account first.",
    };

  return { ok: true, pair };
};
