/**
 * Value a set of holdings, and be honest when it cannot be done.
 *
 * WHY THIS EXISTS
 * The "Total assets in BTC" figure was not a calculation. It was two literals:
 *
 *   const fiatAmount = view ? `$0.00` : "*******";
 *   const amount = view ? (0.0).toFixed(8) : "*******";
 *
 * So an account holding 177.99 USDT, 109.73 PDEX, 99 LINK, 50 UNI and more was
 * told its portfolio was worth $0.00, under an eye-toggle that implies the
 * number is real and private. A placeholder that renders as a plausible value
 * is worse than an empty space, because nobody can tell it apart from a working
 * feature reporting bad news.
 *
 * The rule this follows is the one already applied to failed reads elsewhere in
 * the app: a value we do not have must not be rendered as zero. Zero is a
 * claim. "Unavailable" is the truth.
 *
 * Import-free so it is directly unit testable.
 */

export type HoldingRow = {
  asset?: { ticker?: string | null } | null;
  free?: number | null;
  reserved?: number | null;
  onChainBalance?: string | number | null;
};

/** Price of one unit of `ticker` in the quote currency, or null if unknown. */
export type PriceLookup = (ticker: string) => number | null | undefined;

export type PortfolioValue =
  | {
      status: "unavailable";
      pricedCount: 0;
      unpricedTickers: string[];
      /**
       * How many distinct assets the user actually holds.
       *
       * A valuation we cannot compute should not leave the header showing
       * "- = -", which says nothing and looks broken. The count is something
       * the app genuinely knows and the user can verify against the table
       * below.
       */
      heldCount: number;
    }
  | {
      status: "partial" | "complete";
      total: number;
      pricedCount: number;
      unpricedTickers: string[];
    };

const finite = (value: unknown): number => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** Everything the user holds of one asset, wherever it currently sits. */
export const holdingTotal = (row: HoldingRow): number =>
  finite(row?.free) + finite(row?.reserved) + finite(row?.onChainBalance);

/**
 * Sum the holdings that can be priced.
 *
 * Returns `unavailable` when NOTHING could be priced, so the caller renders a
 * dash instead of a confident zero. `partial` when some assets priced and
 * others did not - the total is real but understated, and the caller should say
 * so rather than presenting it as the whole picture.
 *
 * An asset the user holds none of is not "unpriced": it contributes nothing
 * either way, and listing it would make a complete valuation look partial.
 */
export const portfolioValue = (
  rows: readonly HoldingRow[] | null | undefined,
  priceOf: PriceLookup
): PortfolioValue => {
  let total = 0;
  let pricedCount = 0;
  let heldCount = 0;
  const unpricedTickers: string[] = [];

  for (const row of rows ?? []) {
    const ticker = row?.asset?.ticker;
    if (!ticker) continue;

    const amount = holdingTotal(row);
    if (amount <= 0) continue;
    heldCount += 1;

    const price = priceOf(ticker);
    if (price === null || price === undefined || !Number.isFinite(price)) {
      unpricedTickers.push(ticker);
      continue;
    }

    total += amount * price;
    pricedCount += 1;
  }

  if (pricedCount === 0) {
    return {
      status: "unavailable",
      pricedCount: 0,
      unpricedTickers,
      heldCount,
    };
  }

  return {
    status: unpricedTickers.length > 0 ? "partial" : "complete",
    total,
    pricedCount,
    unpricedTickers,
  };
};
