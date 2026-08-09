"use client";
import { HoverCard, Typography } from "@mitrabook/ux";
import { useState } from "react";
import { RiEyeOffLine, RiEyeLine } from "@remixicon/react";
import { useFunds } from "@orderbook/core/hooks";

import { OverviewCard } from "./overviewCard";
import { portfolioValue } from "./portfolioValue";

export const Overview = () => {
  const [view, setView] = useState(true);

  const IconComponent: typeof RiEyeLine = view ? RiEyeLine : RiEyeOffLine;

  const { balances } = useFunds();

  // This was two literals - `$0.00` and `(0.0).toFixed(8)` - not a calculation.
  // An account holding 177.99 USDT, 109.73 PDEX, 99 LINK, 50 UNI and more was
  // told its portfolio was worth $0.00, beneath an eye-toggle implying the
  // number was real and worth hiding. A placeholder that renders as a plausible
  // value is worse than a blank, because it cannot be told apart from a working
  // feature delivering bad news.
  //
  // There is no BTC price source wired up yet, so `priceOf` returns null for
  // everything and the honest answer today is "unavailable". The valuation is
  // real work (a price index across bridged assets); this commit stops the
  // lying and gives that work a tested seam to land in.
  const value = portfolioValue(balances, () => null);
  const unavailable = value.status === "unavailable";

  // "- = -" under a tooltip is accurate and cryptic: it reads as broken rather
  // than as unpriced. When there is no price source, show what the app DOES
  // know - how many assets are held - which the user can check against the
  // table below. The label changes with it, so the number is never mistaken for
  // a valuation.
  const held = unavailable ? value.heldCount : 0;

  const label = unavailable ? "Assets held" : "Total assets in BTC";

  const amount = !view
    ? "*******"
    : unavailable
      ? `${held} ${held === 1 ? "asset" : "assets"}`
      : value.total.toFixed(8);

  // No second figure to show when there is no valuation - an empty string keeps
  // the row from rendering a lone "=".
  const fiatAmount = !view
    ? "*******"
    : unavailable
      ? ""
      : `$${value.total.toFixed(2)}`;

  return (
    <div className="flex justify-between items-center gap-4 border-b border-secondary-base p-4 flex-wrap">
      <div className="flex flex-col gap-5">
        <HoverCard>
          <HoverCard.Trigger className="w-fit">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1">
                <Typography.Text appearance="primary">{label}</Typography.Text>
                <IconComponent
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => setView(!view)}
                />
              </div>
              <div className="flex items-center gap-1">
                <Typography.Text bold className="text-xl">
                  {amount}
                </Typography.Text>
                {fiatAmount ? (
                  <Typography.Text appearance="primary">
                    ≈ {fiatAmount}
                  </Typography.Text>
                ) : null}
              </div>
            </div>
          </HoverCard.Trigger>
          <HoverCard.Content side="right" withArrow>
            {unavailable
              ? "No price source is configured, so these holdings cannot be valued. The amounts in the table below are exact."
              : "Funding and trading accounts, including funds reserved by open orders."}
          </HoverCard.Content>
        </HoverCard>
      </div>
      <div className="flex items-center gap-2 sm:max-w-[25rem] w-full flex-wrap">
        <OverviewCard icon="RiSkipDownLine" href="/bridge">
          Deposit
        </OverviewCard>
        <OverviewCard icon="RiSkipUpLine" href="/bridge">
          Withdraw
        </OverviewCard>
        <OverviewCard icon="RiArrowLeftRightLine" href="/transfer">
          Transfer
        </OverviewCard>
      </div>
    </div>
  );
};
