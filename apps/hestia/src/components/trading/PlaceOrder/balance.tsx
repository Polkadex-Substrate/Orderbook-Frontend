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

  // The headline is the TOTAL holding, not the trading free balance.
  //
  // It used to be the trading balance, on the reasoning that an order spends
  // that account. Correct, and useless: a user with hundreds of PDEX saw
  // "0.00000001 PDEX Available" and concluded the exchange had lost their
  // money. TWO subtractions were invisible - funds reserved by their own resting
  // orders, and funds in the funding account - and the form named neither.
  //
  // A CEX headlines the total and explains the encumbrances underneath, because
  // "how much do I have?" is the question being asked. The funding slice is not
  // a warning either: this form can move funds, so it is just where the money is
  // standing. `tradable` is still what validation and the percentage buttons use.
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
  const displayAmount =
    tradingAmount === null
      ? children
      : formatDisplay(parts.total, BALANCE_DISPLAY);

  // Only the non-zero encumbrances, in the order a trader cares about: what is
  // locked by their own orders (cancel to recover), then what is one transfer
  // away. Suppressed entirely when everything is already spendable, so the
  // common case stays a single clean line.
  const encumbrances = [
    parts.reserved > 0
      ? `${formatDisplay(parts.reserved, BALANCE_DISPLAY)} in open orders`
      : null,
    parts.funding > 0
      ? `${formatDisplay(parts.funding, BALANCE_DISPLAY)} in funding`
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
            Total
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
            {formatDisplay(parts.tradable, BALANCE_DISPLAY)} tradable
            {" - "}
            {encumbrances.join(", ")}
          </Link>
        </Typography.Text>
      )}
    </div>
  );
};
