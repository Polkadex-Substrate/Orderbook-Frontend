/**
 * Pick the trading balance belonging to one asset id.
 *
 * WHY THIS IS ITS OWN MODULE
 * It was an inline `find` inside useFunds' useMemo, so it could not be tested
 * without a React renderer, react-query and a mocked engine - which is why the
 * defect below survived: the predicate returned `{}` for a malformed entry.
 * `Array.prototype.find` tests the RETURN VALUE for truthiness and `{}` is
 * truthy, so ONE entry with an unresolved asset matched every lookup and every
 * asset in the app reported that entry's free/reserved pair. Identical balances
 * across unrelated tokens, from a single stray record.
 *
 * Import-free on purpose so the rule is directly unit-testable.
 */

export type BalanceLike<A = { id?: string }> = {
  asset?: A;
  free?: number;
  reserved?: number;
};

/**
 * Returns the entry whose asset id matches, or undefined.
 *
 * Deliberately strict: an entry with a missing or mismatched asset is NOT a
 * match. Silently matching such an entry is worse than showing zero, because a
 * zero prompts the user to investigate while a plausible-looking wrong number
 * does not.
 */
export const matchTradingBalance = <
  T extends BalanceLike<{ id?: string } | undefined>,
>(
  balances: readonly T[] | null | undefined,
  assetId: string | undefined
): T | undefined => {
  if (!assetId) return undefined;
  return (balances ?? []).find((b) => b?.asset?.id === assetId);
};
