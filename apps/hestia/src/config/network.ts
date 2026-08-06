/**
 * Testnet detection.
 *
 * There is no dedicated env var for this. The codebase already treats
 * NEXT_PUBLIC_ENABLE_FAUCET as the signal (see components/ui/testnetModal.tsx),
 * on the reasoning that the faucet only exists on the testnet. This keeps that
 * convention in one place instead of re-deriving it per component.
 *
 * Used to hide funding routes that only make sense with real PDEX - buying on
 * a CEX, the Simplex credit-card on-ramp, and the cede.store CEX bridge. None
 * of those can deliver testnet tokens, so on the testnet they are dead ends
 * that send people off-site and lose them.
 */
export const IS_TESTNET = process.env.NEXT_PUBLIC_ENABLE_FAUCET === "true";

/** sessionStorage key set once the testnet notice has been acknowledged. */
export const TESTNET_ACK_KEY = "testnet-notice-acknowledged";

/**
 * Fired on `window` the moment the notice is dismissed.
 *
 * The product tour needs this. Both start on mount, so they used to race: the
 * tour would begin highlighting elements underneath the modal's backdrop, and
 * because the backdrop covers the whole page the spotlight was invisible. The
 * tour appeared to point at nothing on a black screen.
 */
export const TESTNET_ACK_EVENT = "testnet-notice-acknowledged";

/** True when nothing is blocking the viewport: not a testnet, or already ack'd. */
export function isTestnetAcknowledged(): boolean {
  if (!IS_TESTNET) return true;
  if (typeof window === "undefined") return false;
  return !!window.sessionStorage.getItem(TESTNET_ACK_KEY);
}
