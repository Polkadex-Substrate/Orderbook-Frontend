import { parseScientific } from "@orderbook/core/helpers";
import { trimFloat } from "@aksumite/numericals";
// NAN with 2,804
export const formatAmount = (amount: number) => {
  const trimmedBalance = trimFloat({
    value: parseScientific(amount.toString()),
  });
  return trimmedBalance;
};

/*
 * picoScale was deleted on 2026-08-05. It multiplied by 1e-12 and was applied to
 * USDT only, via a hardcoded `ticker === "USDT"` check at three call sites.
 *
 * It was double-scaling. fetchOnChainBalance already divides the raw balance by
 * 10 ** decimals, reading `decimals` live from the chain's pallet_assets
 * metadata, so USDT was scaled once correctly and then again by 1e-12. A 100 USDT
 * balance displayed as 1e-16 - which was also how the scientific-notation bug in
 * the balances table was found.
 *
 * It also returned String(n), and String() emits scientific notation below 1e-7,
 * which is how "1e-16" reached the DOM. Formatting now happens in AmountCard.
 *
 * Do not reintroduce a per-ticker scale factor. If one asset needs different
 * scaling, that belongs in its on-chain metadata, which the fetch already
 * respects.
 */
