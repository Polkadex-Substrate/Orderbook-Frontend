"use client";

import { useMemo, useRef, useState } from "react";
import { Decimal } from "@orderbook/core/utils";
import { hasOnlyZeros, isNegative } from "@orderbook/core/helpers";
import { useMarkets, useTickers } from "@orderbook/core/hooks";
import { Market } from "@orderbook/core/utils/orderbookService";
import { useResizeObserver } from "usehooks-ts";
import classNames from "classnames";

import { Asset } from "./asset";
import { Card } from "./card";

import { getChainFromTicker } from "@/config/assetChain";

export const AssetInfo = ({ currentMarket }: { currentMarket?: Market }) => {
  const [state, setState] = useState("USDT");

  const ref = useRef<HTMLDivElement | null>(null);
  const { width = 0 } = useResizeObserver({
    ref,
    box: "border-box",
  });
  const maxWidth = useMemo(() => width < 590, [width]);

  const { currentTicker, tickerLoading } = useTickers(currentMarket?.id);
  const { loading } = useMarkets();

  const currentPrice = currentTicker?.close ?? "0.00";
  const baseTicker = currentMarket?.baseAsset?.ticker ?? "";
  const quoteTicker = currentMarket?.quoteAsset?.ticker ?? "";

  const changeFormatted = useMemo(
    () =>
      Decimal.format(Number(currentTicker.priceChangePercent24Hr), 2, ",") +
      "%",
    [currentTicker.priceChangePercent24Hr]
  );

  const volumeFormattedQuote = useMemo(
    () =>
      Decimal.format(
        Number(currentTicker?.quoteVolume),
        currentMarket?.quotePrecision ?? 0,
        ","
      ),
    [currentTicker?.quoteVolume, currentMarket?.quotePrecision]
  );

  const volumeFormattedBase = useMemo(
    () =>
      Decimal.format(
        Number(currentTicker?.baseVolume),
        currentMarket?.basePrecision ?? 0,
        ","
      ),
    [currentTicker?.baseVolume, currentMarket?.basePrecision]
  );

  const priceFormatted = useMemo(
    () =>
      hasOnlyZeros(currentPrice.toString())
        ? currentTicker?.currentPrice
        : currentPrice,
    [currentTicker?.currentPrice, currentPrice]
  );

  const negative = useMemo(
    () => isNegative(changeFormatted.toString()),
    [changeFormatted]
  );
  const chainName = useMemo(
    () =>
      getChainFromTicker(currentMarket?.baseAsset?.ticker as string) ??
      "Polkadex",
    [currentMarket?.baseAsset?.ticker]
  );

  return (
    <div
      ref={ref}
      data-tour="market-selector"
      className={classNames(
        "flex flex-wrap border-b border-primary ",
        maxWidth ? "flex-col" : "gap-3"
      )}
    >
      <Asset
        baseTicker={baseTicker}
        quoteTicker={quoteTicker}
        tokenName={chainName}
        loading={tickerLoading || loading}
        inlineView={maxWidth}
      />
      <div
        className={classNames(
          "flex flex-1 flex-wrap gap-3 justify-between px-3 py-1 min-w-[20rem]",
          maxWidth && " border-t border-primary"
        )}
      >
        <Card.Single
          label={`Price ${quoteTicker}`}
          color={negative ? "red" : "green"}
          loading={tickerLoading || loading}
        >
          {priceFormatted}
        </Card.Single>
        <Card.Single
          label="24h Change"
          color={negative ? "red" : "green"}
          loading={tickerLoading || loading}
        >
          {changeFormatted}
        </Card.Single>
        <Card.Single label="24h High" loading={tickerLoading || loading}>
          {currentTicker?.high}
        </Card.Single>
        <Card.Single label="24h Low" loading={tickerLoading || loading}>
          {currentTicker?.low}
        </Card.Single>
        <Card.WithDropdown
          label="24h Volume"
          items={[quoteTicker, baseTicker]}
          selected={state}
          onChange={(e: string) => setState(e)}
          loading={tickerLoading || loading}
        >
          {state === quoteTicker ? volumeFormattedQuote : volumeFormattedBase}
        </Card.WithDropdown>
      </div>
    </div>
  );
};
