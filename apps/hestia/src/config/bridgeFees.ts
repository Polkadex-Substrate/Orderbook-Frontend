/**
 * Bridge fee model, gated for MAINNET.
 *
 * Testnet (flag off, the default): Hyperbridge relayers are subsidised, so
 * `relayerFee: 0` delivers, and the faucet auto-drips PDEX so gas is never the
 * blocker. Behaviour is unchanged from before this flag existed.
 *
 * Mainnet (NEXT_PUBLIC_BRIDGE_MAINNET_FEES=true):
 * - The relayer fee is pulled FROM THE BRIDGED ASSET in the funding account,
 *   so every budget check (insufficient-balance, the auto-move shortfall)
 *   targets amount + fee, and the extrinsic is sent with the fee attached.
 * - The Polkadex-side extrinsic needs PDEX gas; the form blocks with a clear
 *   message instead of letting the signature fail.
 *
 * Build-time values (NEXT_PUBLIC_*), baked per deployment like all bridge
 * config. The fee is denominated in the BRIDGED ASSET's units; the PDEX floor
 * in PDEX.
 */
const num = (v: string | undefined, fallback: number) => {
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

export const BRIDGE_MAINNET_FEES_ENABLED =
  process.env.NEXT_PUBLIC_BRIDGE_MAINNET_FEES === "true";

/** Relayer fee in units of the bridged asset. Only read when the flag is on. */
export const BRIDGE_RELAYER_FEE = num(
  process.env.NEXT_PUBLIC_BRIDGE_RELAYER_FEE,
  0
);

/** Minimum funding-account PDEX to submit the bridge extrinsic. */
export const BRIDGE_MIN_PDEX_FOR_GAS = num(
  process.env.NEXT_PUBLIC_BRIDGE_MIN_PDEX,
  0.5
);
