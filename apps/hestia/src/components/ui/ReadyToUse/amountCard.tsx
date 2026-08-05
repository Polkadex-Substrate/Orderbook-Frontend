import { Typography } from "@mitrabook/ux";
import { ComponentProps } from "react";
import { twMerge } from "tailwind-merge";
import { formatDisplay, toFullPrecision, isTruncated } from "@orderbook/format";

interface Props extends ComponentProps<"div"> {
  fiatAmount?: string;
}

/**
 * A balance cell.
 *
 * This used to render `children` straight into the DOM, so React stringified the
 * number with String() - and String() switches to scientific notation below
 * 1e-7. A USDT funding balance rendered as literally "1e-16" in the balances
 * table. Nobody reads their wallet in scientific notation.
 *
 * Formatting lives here rather than at the call sites because all eight of them
 * (balances table, trading Balances tab, transfer asset picker) pass a raw
 * balance in exactly this shape. Doing it here means a new balance column cannot
 * reintroduce the bug by forgetting to format.
 *
 * Note this is a DISPLAY concern only. It cannot fix a wrong number - see the
 * picoScale double-scaling that produced the 1e-16 in the first place. A
 * formatter that renders a wrong value tidily is worse than one that renders it
 * visibly wrong, so the underlying scaling is tracked separately.
 */
/*
 * Balance cells are capped at 8 decimals. Without a cap, significant-digit
 * formatting renders a 1e-16 dust balance as "0.0000000000000001" - no longer
 * scientific notation, but a 16-decimal wall that is just as unreadable. Capped,
 * it becomes "<0.00000001", which says the true thing: present, but below the
 * smallest amount worth displaying. The exact figure is in the hover title.
 *
 * 8 rather than the assets' on-chain 12 because no testnet asset trades at
 * anything approaching 12 decimals of significance, and 8 is the convention
 * users arrive with from other exchanges.
 */
const BALANCE_OPTIONS = { thousandsSep: ",", assetPrecision: 8 } as const;

export const AmountCard = ({ fiatAmount, children, className }: Props) => {
  // Only numeric children are formatted; anything else (a node, a placeholder
  // string like "-") passes through untouched.
  const isNumeric =
    typeof children === "number" ||
    (typeof children === "string" &&
      children.trim() !== "" &&
      Number.isFinite(Number(children)));

  const value = isNumeric ? (children as number | string) : null;

  return (
    <div className={twMerge("flex flex-col", className)}>
      <Typography.Text
        // The exact figure stays one hover away, so trimming decimals never
        // hides a balance. Omitted when the display is already exact, to avoid a
        // tooltip that just repeats the visible text.
        title={
          value !== null && isTruncated(value, BALANCE_OPTIONS)
            ? toFullPrecision(value)
            : undefined
        }
      >
        {value !== null ? formatDisplay(value, BALANCE_OPTIONS) : children}
      </Typography.Text>
      {fiatAmount && (
        <Typography.Text appearance="secondary" size="xs">
          ≈ ${fiatAmount}
        </Typography.Text>
      )}
    </div>
  );
};
