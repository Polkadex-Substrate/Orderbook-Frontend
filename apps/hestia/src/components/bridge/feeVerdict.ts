/**
 * Can this bridge transfer pay its own fee, and can we even tell?
 *
 * THE FEEDBACK
 * "I don't know what currency is required for paying the fee, and I don't know
 * how much will be taken from which account."
 *
 * The confirm dialog showed:
 *
 *   Estimated fee            Ø
 *   (!) Insufficient balance to pay the transaction fee at source chain
 *
 * Three failures in four lines:
 *
 *   1. "Ø" is not a quantity. It was rendered by `sourceValue ? ... : "Ø"`, so
 *      a fee of zero, a fee still being estimated, and a fee whose estimation
 *      THREW all printed the same empty-set glyph. The ticker was blanked at
 *      the same time (`sourceValue ? sourceFee?.ticker : ""`), which is why no
 *      currency appeared anywhere on the screen.
 *   2. The error named no amount, no currency and no account. On this route the
 *      fee is gas on the source chain - Sepolia ETH - which is a DIFFERENT
 *      asset from the 20 USDC being bridged, and nothing on the dialog said so.
 *      A user who topped up USDC and tried again would fail again.
 *   3. `balance <= fee + existential` with `fee = sourceFee?.amount ?? 0`
 *      returns TRUE whenever both sides are unknown, so a fee estimate that had
 *      not finished, or had failed, produced a confident accusation of
 *      insufficient funds. Not knowing is not the same as knowing you are short.
 *
 * This module decides; the component only renders. Import-free so it is
 * testable without a wallet, a chain or a renderer.
 */

export type FeeInputs = {
  /** Estimated source-chain fee. null/undefined = not known. */
  feeAmount: number | null | undefined;
  /** Currency the fee is charged in. Known even before the amount is. */
  feeTicker: string | null | undefined;
  /** Balance of that currency in the paying account. */
  balanceAmount: number | null | undefined;
  /** Currency of the balance. Must match feeTicker for a comparison to mean anything. */
  balanceTicker: string | null | undefined;
  /** Minimum that must remain (existential deposit on substrate chains). */
  existential?: number | null;
  /**
   * How much is being bridged, and in what.
   *
   * Only affects the sum when `transferTicker === feeTicker` - bridging native
   * ETH out of the account that also pays ETH gas. See the header note.
   */
  transferAmount?: number | null;
  transferTicker?: string | null;
  /** The estimate is in flight. */
  estimating?: boolean;
  /** The estimate failed, with this message. */
  estimateError?: string | null;
};

export type FeeVerdict =
  | { status: "estimating" }
  | { status: "unknown"; reason: string }
  | { status: "mismatch"; feeTicker: string; balanceTicker: string }
  | {
      status: "ok";
      fee: number;
      ticker: string;
      balance: number;
      /** The bridged amount, when it leaves this same balance. Else 0. */
      spend: number;
      remaining: number;
    }
  | {
      status: "insufficient";
      fee: number;
      ticker: string;
      balance: number;
      spend: number;
      shortfall: number;
    };

const num = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const feeVerdict = ({
  feeAmount,
  feeTicker,
  balanceAmount,
  balanceTicker,
  existential,
  transferAmount,
  transferTicker,
  estimating,
  estimateError,
}: FeeInputs): FeeVerdict => {
  if (estimating) return { status: "estimating" };
  if (estimateError) return { status: "unknown", reason: estimateError };

  const fee = num(feeAmount);
  const balance = num(balanceAmount);
  const reserve = num(existential) ?? 0;

  /*
   * THE SECOND BUG, reported on two separate transfers: "left after" was wrong.
   *
   * It read `balance - fee - reserve`, which is wrong twice over.
   *
   *   1. The BRIDGED AMOUNT was never subtracted. Bridging 0.01 native ETH on
   *      Sepolia moves 0.01 ETH out of the very balance that pays the gas, so
   *      "left after" overstated the remainder by the whole transfer. It only
   *      happened to look right for USDC, where the asset and the fee currency
   *      differ - which is the case the original fix was written against.
   *   2. The EXISTENTIAL RESERVE was subtracted. The reserve is not spent; it
   *      is the floor that must stay behind. Deducting it understated what the
   *      user would still hold.
   *
   * The two errors point opposite ways, so on a substrate source they partly
   * cancelled - which is why this survived review.
   *
   * The reserve still belongs in the SUFFICIENCY test (you may not spend below
   * it), just not in the remainder. Those are different questions and the old
   * code answered both with one subtraction.
   */
  const spend =
    feeTicker && transferTicker && transferTicker === feeTicker
      ? Math.max(0, num(transferAmount) ?? 0)
      : 0;

  // Refusing to guess is the whole point. Each of these used to become a
  // confident "insufficient balance".
  if (fee === null)
    return {
      status: "unknown",
      reason: "the network fee has not been estimated yet",
    };
  if (balance === null)
    return {
      status: "unknown",
      reason: `your ${feeTicker || "source chain"} balance could not be read`,
    };
  if (!feeTicker)
    return { status: "unknown", reason: "the fee currency is unknown" };

  // Comparing a fee in one currency against a balance in another is not a
  // comparison. Defensive: today both sides resolve to the source chain's
  // native symbol, and this fires if that ever stops being true.
  if (balanceTicker && balanceTicker !== feeTicker)
    return { status: "mismatch", feeTicker, balanceTicker };

  const required = fee + spend + reserve;
  if (balance < required)
    return {
      status: "insufficient",
      fee,
      ticker: feeTicker,
      balance,
      spend,
      shortfall: required - balance,
    };

  return {
    status: "ok",
    fee,
    ticker: feeTicker,
    balance,
    spend,
    // Reserve deliberately NOT subtracted: it stays in the account.
    remaining: balance - fee - spend,
  };
};

/** Should the confirm button be blocked? Only a definite "no" blocks. */
export const blocksSubmission = (v: FeeVerdict): boolean =>
  v.status === "insufficient" || v.status === "mismatch";

const fmt = (n: number): string => {
  // Gas fees are small; 6 decimals shows them without exponent notation, which
  // String(0.0000021) would produce as "2.1e-6".
  if (n === 0) return "0";
  if (Math.abs(n) < 0.000001) return "<0.000001";
  return n.toFixed(6).replace(/\.?0+$/, "");
};

/**
 * What the dialog prints next to "Estimated fee".
 *
 * Always names the currency, even when the amount is not known - that alone
 * answers "what currency is required", which the old dialog never did.
 */
export const describeFee = (
  v: FeeVerdict,
  feeTicker?: string | null
): string => {
  switch (v.status) {
    case "estimating":
      return `Estimating${feeTicker ? ` (in ${feeTicker})` : ""}...`;
    case "unknown":
      return feeTicker ? `Unknown (paid in ${feeTicker})` : "Unknown";
    case "mismatch":
      return `Quoted in ${v.feeTicker}`;
    default:
      return `~ ${fmt(v.fee)} ${v.ticker}`;
  }
};

/**
 * The line under the fee: where it comes from and what is left.
 *
 * `account` is a display string (wallet name and truncated address) so the user
 * knows WHICH account pays - the second half of the question asked.
 */
export const describeFeeSource = (
  v: FeeVerdict,
  account?: string | null
): string | null => {
  const from = account ? ` in ${account}` : "";
  switch (v.status) {
    case "estimating":
      return null;
    case "unknown":
      return `Cannot confirm you have enough to cover it: ${v.reason}.`;
    case "mismatch":
      return `The fee is charged in ${v.feeTicker} but the balance being checked is ${v.balanceTicker}. This is a configuration error - do not submit.`;
    case "insufficient":
      // When the bridged asset IS the fee currency, saying "the fee is charged
      // in X, not in the asset being bridged" is false and confusing. Both come
      // out of the same balance, and the shortfall already covers both.
      return v.spend > 0
        ? `Needs ${fmt(v.shortfall)} more ${v.ticker}${from}. You have ${fmt(v.balance)} ${v.ticker}, and this transfer costs ${fmt(v.spend)} ${v.ticker} plus ${fmt(v.fee)} ${v.ticker} in fees.`
        : `Needs ${fmt(v.shortfall)} more ${v.ticker}${from}. You have ${fmt(v.balance)} ${v.ticker}; the fee is charged in ${v.ticker}, not in the asset being bridged.`;
    default:
      return v.spend > 0
        ? `Paid from your ${v.ticker} balance${from} (${fmt(v.balance)} ${v.ticker} available, less ${fmt(v.spend)} bridged and ${fmt(v.fee)} in fees, leaves ${fmt(v.remaining)} ${v.ticker}).`
        : `Paid from your ${v.ticker} balance${from} (${fmt(v.balance)} ${v.ticker} available, ${fmt(v.remaining)} left after).`;
  }
};
