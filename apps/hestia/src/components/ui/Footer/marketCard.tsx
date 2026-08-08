import { Typography } from "@mitrabook/ux";
import Link from "next/link";
import { formatDisplay } from "@orderbook/format";

// Matches the balances page and the order form so one holding never reads
// differently in three places.
const PRICE_DISPLAY = { thousandsSep: ",", assetPrecision: 8 } as const;

export const MarketCard = ({
  pair,
  market,
  change,
  price,
  positive = false,
}: {
  pair: string;
  market: string;
  /** null when the 24h change is unknown. Renders a dash. */
  change: number | null;
  /** null when there is no traded price. Renders a dash. */
  price: number | null;
  positive?: boolean;
}) => {
  const marketName = `${pair}/${market}`;

  // "Unknown" and "unchanged" are different facts and must not share a glyph.
  // Every pair in this strip rendered "+ 0 %  0", which is a claim that the
  // market traded and did not move - so the strip read as broken rather than as
  // quiet. A dash says "no data" without pretending otherwise.
  const unknownChange = change === null || !Number.isFinite(change);
  const marketChange = unknownChange
    ? "-"
    : `${positive ? "+" : "-"} ${formatDisplay(Math.abs(change), {
        thousandsSep: ",",
        assetPrecision: 2,
      })} %`;

  // Never render a raw number: String(1e-8) is "1e-8", and this strip carries
  // small prices. formatDisplay renders dust as 0.00000001 or "<0.00000001".
  const unknownPrice = price === null || !Number.isFinite(price);
  const marketPrice = unknownPrice ? "-" : formatDisplay(price, PRICE_DISPLAY);

  return (
    <Link
      href={`/trading/${marketName.replace("/", "")}`}
      className="flex gap-2 ml-2"
      title={
        unknownPrice
          ? `${marketName} has not traded in the last 24 hours`
          : marketName
      }
    >
      <Typography.Text size="xs" bold>
        {marketName}
      </Typography.Text>
      <Typography.Text
        bold
        size="xs"
        // Neutral when unknown. Colouring a dash green claims a direction that
        // nobody measured.
        appearance={
          unknownChange ? "secondary" : positive ? "success" : "danger"
        }
        className="whitespace-nowrap"
      >
        {marketChange}
      </Typography.Text>
      <Typography.Text size="xs" bold appearance="secondary">
        {marketPrice}
      </Typography.Text>
    </Link>
  );
};
