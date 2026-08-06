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
