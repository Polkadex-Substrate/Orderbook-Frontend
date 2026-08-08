/**
 * Which account is the order form's "Available" number talking about?
 *
 * An order spends the TRADING balance, so a zero there is correct even when the
 * user's wallet holds plenty - the funds are simply in the FUNDING account. But
 * "0 USDT Available" beside a balances page showing 100 USDT was reported as the
 * balance failing to update in real time. Nothing was stale. The form just never
 * said which of the two accounts it meant, or that the money was one transfer
 * away.
 *
 * Import-free on purpose so it can be unit tested without a React renderer.
 */

/** Only the fields this logic needs - the real balance objects carry more. */
export type BalanceRow = {
  asset?: { ticker?: string | null } | null;
  onChainBalance?: string | number | null;
  /** Trading balance not locked by a resting order. */
  free?: number | null;
  /** Trading balance locked by resting orders. Fetched as `r`, never displayed. */
  reserved?: number | null;
};

/**
 * The funding (on-chain) amount for a ticker, as a number.
 *
 * Matched on ticker rather than asset id because the order form is given tickers
 * ("USDT"), not ids. Returns 0 for anything unparseable so a bad value can never
 * produce a NaN in the UI.
 */
export const findFundingAmount = (
  balances: BalanceRow[] | null | undefined,
  ticker: string
): number => {
  if (!ticker) return 0;

  const row = (balances ?? []).find((b) => b?.asset?.ticker === ticker);
  const parsed = Number(row?.onChainBalance ?? 0);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

/**
 * Coerce a rendered child into a finite number, or null if it is not numeric.
 *
 * The order form passes its available balance to <Balance> as a number child, and
 * the component rendered it directly - so React stringified it, and
 * `String(1e-8)` is "1e-8". The form showed "1e-8 PDEX Available", which is both
 * unreadable and looks like a bug in the balance rather than in the formatting.
 * JavaScript switches to exponential notation below 1e-6, so any dust balance hit
 * this.
 *
 * Returns null rather than 0 for non-numeric children so the caller can pass them
 * through untouched instead of rendering a misleading "0" over a real element.
 */
export const numericChild = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

/**
 * Show the "move it across" hint?
 *
 * Only when trading is empty AND funding is not. Both halves matter: without the
 * first it nags users who can already trade; without the second it promises funds
 * that do not exist.
 *
 * NOTE: superseded as the PRIMARY display by `balanceBreakdown` below, which
 * shows the whole holding rather than warning about one slice of it. Kept
 * because the hint is still the right thing to say when nothing is tradable.
 */
export const isStrandedInFunding = (
  tradingAmount: number,
  fundingAmount: number
): boolean =>
  Number.isFinite(tradingAmount) &&
  tradingAmount <= 0 &&
  Number.isFinite(fundingAmount) &&
  fundingAmount > 0;

const finite = (value: unknown): number => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export type BalanceParts = {
  /** Spendable right now, without any transfer. */
  tradable: number;
  /** Locked by the user's own resting orders. Recoverable by cancelling. */
  reserved: number;
  /** In the funding account. One transfer away from tradable. */
  funding: number;
  /** Everything the user owns of this asset, across both accounts. */
  total: number;
  /** True when the whole holding is spendable - nothing to explain. */
  allTradable: boolean;
};

/**
 * The whole holding, split by where it currently sits.
 *
 * WHY TOTAL IS THE HEADLINE NUMBER
 * The form used to headline the TRADING free balance and warn about the rest.
 * That is precise and useless: the user sees "0.00000001 PDEX Available" while
 * owning hundreds of PDEX, and the only reasonable conclusion is that the
 * exchange has lost their money. Two separate subtractions were invisible -
 * funds reserved by their own open orders, and funds sitting in the funding
 * account - and the UI named neither.
 *
 * A CEX headlines the total and explains the encumbrances underneath, because
 * the question a trader is actually asking is "how much do I have?", not "how
 * much is in one of two internal ledgers I did not know existed". The order
 * form can move funds on the user's behalf, so the funding slice is not a
 * warning - it is just where the money is standing.
 *
 * `tradable` stays available for validation and for the percentage buttons,
 * which must never fill an amount that cannot be submitted.
 */
export const balanceBreakdown = (
  balances: BalanceRow[] | null | undefined,
  ticker: string,
  tradableOverride?: number | null
): BalanceParts => {
  const row = ticker
    ? (balances ?? []).find((b) => b?.asset?.ticker === ticker)
    : undefined;

  // The order form already computes the tradable figure (it passes it in as the
  // component's child), and that value has been through toHuman. Prefer it, so
  // the headline can never disagree with the number the form validates against.
  const tradable =
    tradableOverride === null || tradableOverride === undefined
      ? finite(row?.free)
      : finite(tradableOverride);

  const reserved = finite(row?.reserved);
  const funding = finite(row?.onChainBalance);
  const total = tradable + reserved + funding;

  return {
    tradable,
    reserved,
    funding,
    total,
    // Compare against the parts rather than `total === tradable`: floating point
    // addition of 0 is exact, but this reads as the intent and stays true if a
    // fourth bucket is ever added.
    allTradable: reserved === 0 && funding === 0,
  };
};
