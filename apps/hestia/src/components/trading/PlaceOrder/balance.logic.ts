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
 */
export const isStrandedInFunding = (
  tradingAmount: number,
  fundingAmount: number
): boolean =>
  Number.isFinite(tradingAmount) &&
  tradingAmount <= 0 &&
  Number.isFinite(fundingAmount) &&
  fundingAmount > 0;
