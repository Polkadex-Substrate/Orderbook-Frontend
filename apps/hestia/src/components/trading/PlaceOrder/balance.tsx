"use client";

import { Button, Dropdown, Icons, Typography } from "@mitrabook/ux";
import Link from "next/link";
import { PropsWithChildren } from "react";
import { useFunds } from "@orderbook/core/hooks";
import { formatDisplay } from "@orderbook/format";

import { balanceBreakdown, numericChild } from "./balance.logic";

import { getChainFromTicker } from "@/config/assetChain";

// Matches the balances page (ui/ReadyToUse/amountCard.tsx) so the same holding
// does not read differently in two places. assetPrecision 8 is the exchange's
// display precision.
const BALANCE_DISPLAY = { thousandsSep: ",", assetPrecision: 8 } as const;

export const Balance = ({
  baseTicker,
  children,
}: PropsWithChildren<{ baseTicker: string }>) => {
  const chainName = getChainFromTicker(baseTicker);

  // The headline is SPENDABLE: trading free balance plus funding.
  //
  // It arrived there in two steps, and both are worth keeping straight.
  //
  // It began as the trading balance alone, on the reasoning that an order
  // spends that account. Correct, and useless: a user with hundreds of PDEX saw
  // "0.00000001 PDEX Available" and concluded the exchange had lost their
  // money. Two subtractions were invisible - funds reserved by their own resting
  // orders, and funds in the funding account - and the form named neither.
  //
  // The fix over-corrected to the TOTAL, and that was reported too: "my real
  // balance is around $42 but the UI shows $99". Also true, also useless - the
  // 56 locked in resting orders is not reachable from this form, so the headline
  // promised money the very next click would refuse.
  //
  // Spendable is the number this form will actually honour: it can move funding
  // across on submit (useMoveAndTrade deposits, waits for the credit, THEN
  // places the order), and it cannot cancel an order. Validation uses the same
  // figure, so the headline and the red border can no longer disagree.
  //
  // Read here rather than passed in as a prop on purpose. There are four call
  // sites (Limit/Market x buy/sell) and the value would have to be threaded
  // through PlaceOrder and two index components to reach each one - seven files
  // for one string, and a missed call site would silently show nothing. useFunds
  // is react-query backed, so this adds no request; it reuses the cache the order
  // form has already populated.
  //
  // The two decisions live in balance.logic.ts, where they are unit tested. The
  // NaN and both-empty cases are easy to get wrong and both render badly.
  const { balances } = useFunds();
  const tradingAmount = numericChild(children);
  const parts = balanceBreakdown(balances, baseTicker, tradingAmount);

  // NEVER render a raw number here. React stringifies it, and String(1e-8) is
  // "1e-8" - the form showed "1e-8 PDEX Available", which reads as a broken
  // balance rather than a formatting choice. JavaScript goes exponential below
  // 1e-6, so every dust balance hit this. formatDisplay renders 1e-8 as
  // 0.00000001, and anything smaller as "<0.00000001" rather than a misleading
  // rounded zero. It is already covered by packages/format's own suite.
  //
  // A non-numeric child (a skeleton element, a dash) passes through untouched.
  // SPENDABLE, not total. Reported after the previous change went out: "my real
  // balance in USDT is around $42, but the UI shows I still have $99". Both
  // numbers were right - 42.993 tradable, 1 in funding, 56 locked in the user's
  // own resting orders - but only the first two can be spent here, because this
  // form can move funding across and cannot cancel an order. A headline the
  // form will not honour is worse than the trading-only figure it replaced.
  const displayAmount =
    tradingAmount === null
      ? children
      : formatDisplay(parts.spendable, BALANCE_DISPLAY);

  // Only the non-zero encumbrances, in the order a trader cares about: what is
  // locked by their own orders (cancel to recover), then what is one transfer
  // away. Suppressed entirely when everything is already spendable, so the
  // common case stays a single clean line.
  //
  // Order matters: what is spendable now, then what is one click away, then what
  // is locked. "in open orders" is listed last and phrased as locked because it
  // is the only slice this form cannot reach.
  // Reworded 2026-08-10 after tester feedback (Suresh): "the main one should
  // just show the tradable amount or available amount to trade... below it
  // should say spendable = trading + funding. Just the messaging."
  //
  // The NUMBER did not change, deliberately. It has to equal what the form will
  // accept, or we recreate the "$42 real, $99 displayed" complaint from earlier
  // in the week - a headline that disagrees with the validation ceiling and the
  // percentage buttons is the same bug wearing different words.
  //
  // What changed is the label: "Spendable" -> "available to trade", and the
  // sub-line now spells out the sum rather than listing parts side by side. The
  // distinction worth holding onto is that funding IS available to trade; it is
  // one automatic step away, not unavailable. So the sub-line says "moved
  // automatically" instead of leaving the user to wonder why the two numbers
  // differ.
  const encumbrances = [
    parts.funding > 0
      ? `${formatDisplay(parts.tradable, BALANCE_DISPLAY)} ready now + ${formatDisplay(parts.funding, BALANCE_DISPLAY)} from funding, moved automatically`
      : null,
    parts.reserved > 0
      ? `${formatDisplay(parts.reserved, BALANCE_DISPLAY)} locked in open orders`
      : null,
  ].filter(Boolean) as string[];

  return (
    <div className="self-end flex flex-col items-end gap-0.5">
      <div className="flex items-center gap-1">
        {/* The balance itself links to the transfer page - moving funds between
            funding and trading accounts was only reachable through the tiny
            dropdown icon (whose onClick was a leftover window.alert("...")). */}
        <Link
          href={`/transfer/${baseTicker}`}
          className="flex items-center gap-1 hover:underline"
          title="Transfer between funding and trading account"
        >
          <Typography.Text size="xs">
            {displayAmount} {baseTicker}
          </Typography.Text>
          <Typography.Text size="xs" appearance="primary">
            available to trade
          </Typography.Text>
        </Link>
        <Dropdown>
          <Dropdown.Trigger asChild>
            <Button.Icon size="xs" title="Deposit, withdraw or transfer">
              <Icons.Exchange />
            </Button.Icon>
          </Dropdown.Trigger>
          <Dropdown.Content>
            <Dropdown.Item>
              <Typography.Text asChild size="sm">
                <Link
                  href={{
                    pathname: "/bridge",
                    query: {
                      from: "Polkadex",
                      to: chainName,
                      asset: baseTicker,
                    },
                  }}
                >
                  Withdraw
                </Link>
              </Typography.Text>
            </Dropdown.Item>
            <Dropdown.Item>
              <Typography.Text asChild size="sm">
                <Link
                  href={{
                    pathname: "/bridge",
                    query: {
                      from: chainName,
                      to: "Polkadex",
                      asset: baseTicker,
                    },
                  }}
                >
                  Deposit
                </Link>
              </Typography.Text>
            </Dropdown.Item>
            <Dropdown.Item>
              <Typography.Text asChild size="sm">
                <Link href={`/transfer/${baseTicker}`}>Transfer</Link>
              </Typography.Text>
            </Dropdown.Item>
          </Dropdown.Content>
        </Dropdown>
      </div>

      {/* Informational, not a warning. `appearance="attention"` on the old
          funding hint made a perfectly normal state - money sitting in the
          funding account - look like something had gone wrong. Reserved and
          funding balances are both ordinary; the user only needs to know where
          their money is, and that the tradable slice is smaller than the total. */}
      {encumbrances.length > 0 && (
        <Typography.Text asChild size="xs" appearance="secondary">
          <Link
            href={`/transfer/${baseTicker}`}
            className="hover:underline"
            title={`Move ${baseTicker} between your Funding and Trading accounts`}
          >
            {encumbrances.join(" - ")}
          </Link>
        </Typography.Text>
      )}
    </div>
  );
};
