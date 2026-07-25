"use client";

import { useMemo, useState } from "react";
import {
  Popover,
  Typography,
  Skeleton,
  Token,
  tokenAppearance,
} from "@mitrabook/ux";
import classNames from "classnames";
import Link from "next/link";
import { RiArrowDownSLine } from "@remixicon/react";
import { useMarkets } from "@orderbook/core/hooks";
import { isNegative } from "@orderbook/core/helpers";
import { Decimal } from "@orderbook/core/utils";

/**
 * Pair selector. The old version was a Link back to the same page — clicking
 * the pair did nothing useful. It now opens a popover listing every market
 * (sorted by 24h volume) for direct switching; the right-rail Markets tab
 * remains the searchable/filterable variant.
 */
export const Asset = ({
  baseTicker,
  quoteTicker,
  tokenName,
  loading,
  inlineView,
}: {
  baseTicker: string;
  quoteTicker: string;
  tokenName: string;
  loading: boolean;
  inlineView?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const { marketTokens } = useMarkets();

  const sortedMarkets = useMemo(
    () =>
      [...(marketTokens ?? [])].sort(
        (a, b) => Number(b.volume) - Number(a.volume)
      ),
    [marketTokens]
  );

  const currentRoute = `${baseTicker}${quoteTicker}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className={classNames(
          "flex items-center gap-2 px-4 min-w-[10rem] hover:bg-level-1 transition-colors",
          inlineView ? "py-1" : "md:border-r border-primary"
        )}
        aria-label="Switch trading pair"
      >
        <Skeleton loading={!baseTicker} className="w-full h-8 max-w-8">
          <Token
            appearance={baseTicker as keyof typeof tokenAppearance}
            name={baseTicker}
            size="md"
            className="rounded-full border border-primary"
          />
        </Skeleton>
        <div className="flex h-full flex-1">
          <div
            className={classNames(
              "flex flex-row-reverse gap-0.5 flex-1 h-full",
              inlineView
                ? "items-center justify-between"
                : "flex-col justify-center"
            )}
          >
            <Skeleton loading={loading} className="h-4 max-h-4 max-w-12">
              <div className="flex items-center gap-1">
                <Typography.Text size="xs" appearance="primary">
                  {tokenName}
                </Typography.Text>
              </div>
            </Skeleton>
            <Skeleton
              loading={!baseTicker || !quoteTicker}
              className="h-4 max-h-4 max-w-8 "
            >
              <div className="flex items-center gap-1">
                <Typography.Text size="md" bold className="leading-none">
                  {baseTicker}/{quoteTicker}
                </Typography.Text>
                <RiArrowDownSLine
                  className={classNames(
                    "w-4 h-4 transition-transform",
                    open && "rotate-180"
                  )}
                />
              </div>
            </Skeleton>
          </div>
        </div>
      </Popover.Trigger>
      <Popover.Content className="z-30 flex flex-col w-72 max-h-96 overflow-y-auto bg-level-0 border border-primary rounded-md shadow-md p-1">
        {sortedMarkets.length === 0 ? (
          <Typography.Text size="xs" appearance="primary" className="p-3">
            No markets available
          </Typography.Text>
        ) : (
          sortedMarkets.map((market) => {
            const route = `${market.baseAsset.ticker}${market.quoteAsset.ticker}`;
            const active = route === currentRoute;
            const negative = isNegative(market.price_change_percent ?? "0");
            return (
              <Link
                key={market.id}
                href={`/trading/${route}`}
                onClick={() => setOpen(false)}
                className={classNames(
                  "flex items-center gap-2 px-2 py-2 rounded-sm hover:bg-level-1 transition-colors",
                  // Soft highlight: translucent fill + accent edge reads as
                  // "current" without drowning the row's text contrast.
                  active && "bg-level-2/40 border-l-2 border-primary-base"
                )}
              >
                <Token
                  appearance={
                    market.baseAsset.ticker as keyof typeof tokenAppearance
                  }
                  name={market.baseAsset.ticker}
                  size="xs"
                  className="rounded-full border border-primary shrink-0"
                />
                <div className="flex flex-col flex-1 min-w-0">
                  <Typography.Text size="xs" bold>
                    {market.baseAsset.ticker}/{market.quoteAsset.ticker}
                  </Typography.Text>
                  <Typography.Text size="xs" appearance="primary">
                    Vol {Decimal.format(Number(market.volume), 2, ",")}
                  </Typography.Text>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <Typography.Text size="xs">
                    {Decimal.format(Number(market.last), 4, ",")}
                  </Typography.Text>
                  <Typography.Text
                    size="xs"
                    appearance={negative ? "danger" : "success"}
                  >
                    {Decimal.format(
                      Number(market.price_change_percent ?? 0),
                      2,
                      ","
                    )}
                    %
                  </Typography.Text>
                </div>
              </Link>
            );
          })
        )}
      </Popover.Content>
    </Popover>
  );
};
