/**
 * Which asset rows the balances table should show.
 *
 * THE BUG THIS FIXES
 * "Hide 0 balances" filtered on `free_balance` alone. In the balances table
 * (apps/hestia/.../balances/Table/columns.tsx) the three columns map like this:
 *
 *     onChainBalance   -> "Funding account"
 *     free_balance     -> "Trading account"
 *     inOrdersBalance  -> "In orders"
 *
 * So the filter asked "is the TRADING balance zero" while calling itself "hide 0
 * balances". An asset sitting in the funding account with nothing moved across
 * yet - which is every asset immediately after a deposit, and the single most
 * common state for a new user - was treated as empty and hidden.
 *
 * That was survivable while the toggle defaulted to off. It is not survivable as
 * a default, which is why the predicate is fixed here rather than the default
 * simply being flipped: the first screenshot of the feature request showed 100
 * PDEX in Funding and 0 in Trading, which is precisely the row that would have
 * vanished.
 *
 * Import-free so the rule is testable without a wallet or a renderer.
 */

/** Balances below this are dust and count as nothing. Matches the prior rule. */
export const DUST_THRESHOLD = 0.001;

export type BalanceLike = {
  /** Funding account, on chain. */
  onChainBalance?: string | number | null;
  /** Trading account, free to trade. */
  free_balance?: string | number | null;
  /** Committed to open orders. */
  inOrdersBalance?: string | number | null;
};

/** Coerce a balance field to a number without turning junk into zero silently. */
const amount = (value?: string | number | null): number => {
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Everything the user holds of this asset, wherever it currently sits.
 *
 * Funds in open orders are included deliberately. They are committed, not
 * spent, and an asset disappearing from the list because all of it is working
 * in the book would be alarming in exactly the wrong way.
 */
export const totalHeld = (balance?: BalanceLike | null): number =>
  amount(balance?.onChainBalance) +
  amount(balance?.free_balance) +
  amount(balance?.inOrdersBalance);

/**
 * Does the user hold nothing of this asset, anywhere?
 *
 * This is the question "hide 0 balances" was always asking, and the question the
 * old implementation did not answer.
 */
export const isEmptyBalance = (
  balance?: BalanceLike | null,
  dustThreshold: number = DUST_THRESHOLD
): boolean => totalHeld(balance) < dustThreshold;

/**
 * Should this row be shown?
 *
 * @param balance    The asset's three balances.
 * @param hideZero   Whether the "Hide 0 balances" toggle is on.
 * @param hasSearch  Whether the user has typed a search term.
 *
 * A search term overrides the toggle. Someone typing "USDC" into a filter box
 * and getting an empty list concludes the asset does not exist, not that it is
 * hidden by a checkbox elsewhere on the page. An explicit request beats a
 * standing preference.
 */
export const shouldShowAsset = (
  balance: BalanceLike | null | undefined,
  hideZero: boolean,
  hasSearch: boolean
): boolean => {
  if (!hideZero) return true;
  if (hasSearch) return true;
  return !isEmptyBalance(balance);
};
