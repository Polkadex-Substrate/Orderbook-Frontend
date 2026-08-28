/**
 * Is the bridge sending to the account the user is actually signed in as?
 *
 * THE REPORT
 * A tester bridged 0.01 ETH from Sepolia, and it arrived. They bridged a second
 * 0.01 ETH and after fifteen hours it had arrived nowhere they could see. The
 * one thing they noticed in between: the Confirm Transaction dialog showed the
 * destination as "Substrate Account 1", not "test account", which is who they
 * were signed in as.
 *
 * WHAT THE CODE SAYS
 * `BridgeProvider` keeps its own `substrateAccount` in local state, picked from
 * the raw extension account list. It has NO connection to the profile provider's
 * `selectedAddresses.mainAddress` - the account the rest of the app calls "your
 * account". The two can be different accounts in the same wallet and nothing
 * anywhere says so.
 *
 * The dialog was not lying: `destinationAccount.name` and the address that goes
 * into the transaction come from the same object, and `transferTokens` embeds
 * `decodeAddress(recipient)`. So if it said Substrate Account 1, the funds went
 * to Substrate Account 1. They are not lost - they are in the other account, in
 * the same wallet, invisible because the app only ever shows the signed-in one.
 *
 * The failure is not the transfer. It is that a bridge can quietly target an
 * account other than the one you are looking at, and the confirm screen treats
 * that as unremarkable.
 *
 * WHY COMPARE PUBLIC KEYS, NOT ADDRESSES
 * The same key renders as a different string under every SS58 prefix - Polkadex
 * is 88, extensions commonly hand back 42 or 0. Comparing the printed strings
 * would flag a mismatch on every single transfer, and a warning that always
 * fires is a warning nobody reads. So the caller injects the decoder and this
 * module compares keys.
 *
 * Import-free: `toPublicKey` is a parameter, so every branch is testable
 * without a keyring.
 */

export type DestinationCheck =
  /** Not enough information to compare. Say nothing rather than guess. */
  | { status: "unknown" }
  | { status: "match" }
  | {
      status: "mismatch";
      /** Name the bridge will send to, for the warning text. */
      destinationName: string;
      /** Name the app is signed in as. */
      signedInName: string;
    };

export type DestinationCheckInputs = {
  destinationAddress?: string | null;
  destinationName?: string | null;
  signedInAddress?: string | null;
  signedInName?: string | null;
  /** Returns a stable, prefix-independent identity, or null if undecodable. */
  toPublicKey: (address: string) => string | null;
};

export const checkDestination = ({
  destinationAddress,
  destinationName,
  signedInAddress,
  signedInName,
  toPublicKey,
}: DestinationCheckInputs): DestinationCheck => {
  if (!destinationAddress || !signedInAddress) return { status: "unknown" };

  /*
   * An undecodable address must NOT become a mismatch. `decodeAddress` throws
   * on anything it does not recognise, and a warning raised because we could
   * not read an address is indistinguishable, to the user, from a warning that
   * their funds are about to go somewhere else. Unknown means unknown.
   */
  let destKey: string | null = null;
  let signedKey: string | null = null;
  try {
    destKey = toPublicKey(destinationAddress);
    signedKey = toPublicKey(signedInAddress);
  } catch {
    return { status: "unknown" };
  }
  if (!destKey || !signedKey) return { status: "unknown" };

  if (destKey.toLowerCase() === signedKey.toLowerCase()) return { status: "match" };

  return {
    status: "mismatch",
    destinationName: destinationName?.trim() || "another account",
    signedInName: signedInName?.trim() || "the account you are signed in as",
  };
};

/**
 * The warning, or null when there is nothing to warn about.
 *
 * Deliberately says where the funds WILL go and that they are recoverable,
 * because the tester's actual question was "did I lose it". Being able to
 * answer that on the confirm screen, before sending, is the whole point.
 */
export const describeDestination = (check: DestinationCheck): string | null => {
  if (check.status !== "mismatch") return null;
  return `Heads up: this sends to ${check.destinationName}, which is not ${check.signedInName}. Funds will arrive in ${check.destinationName} and will not show in this app until you switch to it.`;
};
