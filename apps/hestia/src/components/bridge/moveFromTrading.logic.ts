/**
 * Decision logic for the consent-gated "move from trading before bridging"
 * flow, extracted from the modal and the bridge form so it can be unit tested.
 *
 * Everything here is a pure function of its inputs. The React components are
 * deliberately thin shells over these: the parts that decide WHETHER money
 * moves and HOW MUCH are the parts that must be testable without a wallet, an
 * engine, or a browser.
 */

export type MoveStep = "consent" | "withdrawing" | "waiting" | "done" | "error";

/**
 * Absorbs float dust between two balances that are read on different paths
 * (funding from pallet_assets, trading from the engine). Without it, a trading
 * balance that covers the shortfall EXACTLY can flicker between "offer the
 * move" and "insufficient" as the two floats disagree in the last bits.
 */
export const COVER_EPSILON = 1e-9;

/**
 * Round UP at 8dp. Withdrawing exactly the (float) shortfall can leave the
 * funding account one atom short of the target after the engine's own
 * rounding, which would re-block the transfer after the user already waited
 * minutes for settlement. One extra 1e-8 of the asset is the cheap insurance.
 */
export const ceil8 = (n: number): number => Math.ceil(n * 1e8) / 1e8;

/**
 * How much must move from trading to funding for the transfer to proceed - or
 * 0 when the move should NOT be offered.
 *
 * 0 means "say Insufficient balance, as before" and is returned when:
 * - the source is EVM (there is no trading account on that side),
 * - nothing was entered,
 * - funding alone already covers it (no move needed),
 * - funding + trading together still cannot cover it (a move would not help).
 *
 * The returned value is exactly the shortfall - never "all of trading", never
 * a padded amount. The consent screen shows this number and the withdrawal
 * uses this number; they must be the same number.
 */
export const computeCoverableShortfall = (input: {
  isEvmSource: boolean;
  amountNeeded: number;
  fundingBalance: number;
  tradingFreeBalance: number;
}): number => {
  const { isEvmSource, amountNeeded, fundingBalance, tradingFreeBalance } =
    input;
  if (isEvmSource) return 0;
  if (!amountNeeded || !Number.isFinite(amountNeeded) || amountNeeded <= 0)
    return 0;

  const shortfall = amountNeeded - fundingBalance;
  if (shortfall <= 0) return 0;

  return shortfall <= tradingFreeBalance + COVER_EPSILON ? shortfall : 0;
};

/** The amount actually withdrawn once the user consents. */
export const withdrawalAmount = (shortfall: number): number => ceil8(shortfall);

/**
 * May closing the dialog reset it back to the consent screen?
 *
 * Only in states with nothing in flight. While a withdrawal is signing or
 * settling, closing hides the window but must NOT reset the flow - the
 * withdrawal exists whether or not the dialog is visible, and resetting would
 * offer the user a second withdrawal for the same shortfall.
 */
export const canResetOnClose = (step: MoveStep): boolean =>
  step === "consent" || step === "done" || step === "error";

/** Have the moved funds landed? (Poll resolution condition.) */
export const hasFundingArrived = (
  fundingBalance: number,
  amountNeeded: number
): boolean => fundingBalance >= amountNeeded;

/**
 * Mainnet fee model. On testnet Hyperbridge relayers are subsidised and
 * `relayerFee: 0` delivers fine; on mainnet the relayer fee is pulled FROM THE
 * BRIDGED ASSET in the funding account, so every budget check must target
 * amount + fee, not amount. Gated by a flag so testnet behaviour is unchanged.
 */
export const totalFundingNeeded = (
  amount: number,
  opts: { feesEnabled: boolean; relayerFee: number }
): number => {
  if (!amount || !Number.isFinite(amount) || amount <= 0) return 0;
  return opts.feesEnabled ? amount + Math.max(opts.relayerFee, 0) : amount;
};

/**
 * The Polkadex-side bridge extrinsic costs PDEX gas from the funding account.
 * Nothing validated this: a user with zero PDEX passed every check and failed
 * at signing - after potentially waiting minutes for an auto-move to settle.
 */
export const hasGasForBridge = (
  pdexBalance: number,
  minPdex: number,
  checkEnabled: boolean
): boolean => !checkEnabled || pdexBalance >= minPdex;
