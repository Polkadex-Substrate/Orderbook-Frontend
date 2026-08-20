/**
 * How much of an asset can actually leave the funding account, and what to say
 * when the answer is "none".
 *
 * THE REPORT (Ybug #3, iOS, /transfer/PDEX?type=deposit)
 * A new user with their first faucet drip - 1 PDEX - opened the deposit
 * confirmation and met a disabled button and, in red:
 *
 *     "Your balance is not enough to pay the fee."
 *
 * That sentence is false. Their balance covered the fee comfortably. What they
 * could not do is keep the 1 PDEX the chain requires an account to hold to stay
 * alive (the existential deposit). The modal's check was:
 *
 *     walletBalance < fee + existential
 *
 * so anyone under ~1.013 PDEX could deposit NOTHING, and the person this hits
 * by construction is every brand-new user whose entire balance is one faucet
 * drip. The most valuable moment in the funnel ended in a lie about fees.
 *
 * THE SECOND DEFECT THIS FILE REMOVES
 * The FORM validated with a hardcoded `ESTIMATED_FEE = 0.02` while the MODAL
 * used the real quoted fee, and the modal ignored the deposit amount entirely.
 * Two components enforcing two different versions of one chain rule, one of
 * them wrongly. Both now ask this module.
 *
 * THE RULE, ONCE
 * For PDEX (the fee asset): what leaves = amount + fee, and what remains must
 * be at least the existential deposit:
 *
 *     maxDepositable = balance - fee - existential
 *
 * For any other asset: the fee is paid in PDEX, so only the asset's own
 * existential floor binds it. Callers pass the asset's ED; PDEX's is 1.
 *
 * Import-free and pure, so the arithmetic and the copy are testable without a
 * wallet, a chain, or a renderer.
 */

export type DepositCapacityInput = {
  /** On-chain balance of the asset in the funding account. */
  balance: number;
  /** The real quoted fee for this extrinsic, in the FEE asset (PDEX). */
  fee: number;
  /** Existential deposit for this asset: 1 for PDEX. */
  existential: number;
  /** Is this the fee asset itself (PDEX)? Fee only competes with PDEX. */
  isFeeAsset: boolean;
};

const toNumber = (value: unknown): number => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * The largest amount that can be deposited right now, never negative.
 */
export const maxDepositable = ({
  balance,
  fee,
  existential,
  isFeeAsset,
}: DepositCapacityInput): number => {
  const held = toNumber(balance);
  const reserved = isFeeAsset
    ? toNumber(fee) + toNumber(existential)
    : toNumber(existential);
  return Math.max(held - reserved, 0);
};

/** Can this amount actually be deposited? The one rule both UIs must share. */
export const canDeposit = (
  amount: number,
  input: DepositCapacityInput
): boolean => {
  const value = toNumber(amount);
  return value > 0 && value <= maxDepositable(input);
};

export type DepositBlockReason =
  | { kind: "ok"; max: number }
  | { kind: "amount-too-high"; max: number }
  /** The balance cannot cover fee + existential: NOTHING can be deposited. */
  | { kind: "below-existential-floor"; max: 0; shortfall: number };

/**
 * Why a deposit is blocked, distinguished because the remedies differ.
 *
 * "amount-too-high" is fixed by typing a smaller number. "below-existential-
 * floor" cannot be fixed on this screen at all - the user needs more of the
 * asset - and pretending otherwise (or blaming the fee) is what made the
 * original report. The shortfall is included so the UI can say exactly how much
 * more is needed rather than gesturing at the problem.
 */
export const depositBlockReason = (
  amount: number,
  input: DepositCapacityInput
): DepositBlockReason => {
  const max = maxDepositable(input);
  if (max <= 0) {
    const reserved = input.isFeeAsset
      ? toNumber(input.fee) + toNumber(input.existential)
      : toNumber(input.existential);
    return {
      kind: "below-existential-floor",
      max: 0,
      shortfall: reserved - toNumber(input.balance),
    };
  }
  if (toNumber(amount) > max) return { kind: "amount-too-high", max };
  return { kind: "ok", max };
};

/**
 * What to tell the user. Honest about WHICH constraint bound.
 *
 * Never "not enough to pay the fee" when the fee is not the problem. The
 * existential deposit is unfamiliar to most users, so the copy says what it is
 * for in plain words rather than naming the mechanism and moving on.
 */
export const depositBlockMessage = (
  reason: DepositBlockReason,
  ticker: string
): string | null => {
  switch (reason.kind) {
    case "ok":
      return null;
    case "amount-too-high":
      return (
        `You can deposit up to ${reason.max} ${ticker}. ` +
        `The rest stays behind to keep your funding account active and cover the network fee.`
      );
    case "below-existential-floor":
      return (
        `Your funding account must keep a minimum balance of ${ticker} to stay ` +
        `active, and after the network fee there is nothing left to deposit. ` +
        `Add at least ${reason.shortfall} more ${ticker} to your funding account first.`
      );
  }
};
