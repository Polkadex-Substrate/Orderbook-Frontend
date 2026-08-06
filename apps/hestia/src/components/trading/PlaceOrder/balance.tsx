"use client";

import { Button, Dropdown, Icons, Typography } from "@mitrabook/ux";
import Link from "next/link";
import { PropsWithChildren } from "react";
import { useFunds } from "@orderbook/core/hooks";
import { formatDisplay } from "@orderbook/format";

import {
  findFundingAmount,
  isStrandedInFunding,
  numericChild,
} from "./balance.logic";

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

  // "Available" is the TRADING balance, because that is what an order spends.
  // A zero there is correct even when the wallet holds plenty - the funds are
  // simply in the funding account. But "0 USDT Available" beside a wallet showing
  // 100 USDT reads as a stale number, and was reported as exactly that. Nothing
  // was stale; the form just never said which of the two accounts was empty.
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
  const fundingAmount = findFundingAmount(balances, baseTicker);
  const tradingAmount = numericChild(children);
  const strandedInFunding = isStrandedInFunding(
    tradingAmount ?? 0,
    fundingAmount
  );

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
      : formatDisplay(tradingAmount, BALANCE_DISPLAY);

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
            Available
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

      {strandedInFunding && (
        <Typography.Text asChild size="xs" appearance="attention">
          <Link
            href={`/transfer/${baseTicker}`}
            className="hover:underline"
            title={`Move ${baseTicker} from your Funding account to your Trading account`}
          >
            {formatDisplay(fundingAmount, BALANCE_DISPLAY)} {baseTicker} in
            Funding - transfer to trade
          </Link>
        </Typography.Text>
      )}
    </div>
  );
};
