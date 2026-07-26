/**
 * Testnet detection.
 *
 * There is no dedicated env var for this. The codebase already treats
 * NEXT_PUBLIC_ENABLE_FAUCET as the signal (see components/ui/testnetModal.tsx),
 * on the reasoning that the faucet only exists on the testnet. This keeps that
 * convention in one place instead of re-deriving it per component.
 *
 * Used to hide funding routes that only make sense with real PDEX — buying on
 * a CEX, the Simplex credit-card on-ramp, and the cede.store CEX bridge. None
 * of those can deliver testnet tokens, so on the testnet they are dead ends
 * that send people off-site and lose them.
 */
export const IS_TESTNET = process.env.NEXT_PUBLIC_ENABLE_FAUCET === "true";
