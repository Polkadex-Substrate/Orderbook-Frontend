"use client";

import classNames from "classnames";
import { useOrderbookTable } from "@orderbook/core/hooks";
import { useRef } from "react";
import { GenericMessage, Typography } from "@mitrabook/ux";
import { Decimal } from "@orderbook/core/utils";

import { useNotifyFill } from "../orderbookFill";

import { GenericAction } from "./columns";

export const Table = ({
  isSell = false,
  pricePrecision,
  qtyPrecision,
  active,
  orders,
  asks,
  bids,
}: {
  isSell?: boolean;
  pricePrecision: number;
  qtyPrecision: number;
  active?: boolean;
  orders: string[][];
  bids: string[][];
  asks: string[][];
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  const {
    changeMarketAmount,
    changeMarketAmountSumClick,
    changeMarketPrice,
    total,
    volumeData,
  } = useOrderbookTable({
    orders,
    contentRef,
    isSell,
    asks,
    bids,
  });

  // notifyFill drives the highlight. It must fire on every click, even when
  // the value written is identical to what the field already held: core's
  // changeMarketPrice skips the state update in that case, so value-watching
  // silently missed those clicks and the flash looked random.
  const notifyFill = useNotifyFill();

  const onChangePrice: GenericAction = (selectedIndex) => {
    changeMarketPrice(selectedIndex, isSell ? "asks" : "bids");
    notifyFill("price");
  };

  const onChangeAmount: GenericAction = (selectedIndex) => {
    changeMarketAmount(selectedIndex, isSell ? "asks" : "bids");
    notifyFill("amount");
  };

  const onChangeTotal: GenericAction = (selectedIndex) => {
    changeMarketAmountSumClick(selectedIndex);
    notifyFill("total");
  };

  // Row click loads BOTH price and amount - "take this order" is the common
  // intent, and typing a smaller size over the amount is quicker than typing
  // a size from scratch. Safe now that an over-balance amount surfaces as an
  // inline error plus the "Move X & Buy/Sell" action rather than a wall of
  // red. Clicking the amount or total cell still copies just that value.
  const onChangeAllValues: GenericAction = (selectedIndex) => {
    changeMarketPrice(selectedIndex, isSell ? "asks" : "bids");
    changeMarketAmount(selectedIndex, isSell ? "asks" : "bids");
    // Both fields, so a row click highlights both even if one value is
    // unchanged. Previously a row sharing its price with the form flashed
    // only the amount, which read as a half-broken control.
    notifyFill("price", "amount");
  };

  if (!active) return null;

  // "No data" reads as a failed fetch. An empty side of the book is a normal
  // state on a quiet market, and saying which side is empty tells the user
  // there is room for their order rather than that something is broken.
  if (!orders.length)
    return (
      <GenericMessage
        title={isSell ? "No sell orders" : "No buy orders"}
        illustration="NoData"
        className="bg-level-0 p-0"
        imageProps={{
          className: "w-10 self-center flex-1",
        }}
      />
    );

  return (
    <div
      ref={contentRef}
      className={classNames(
        !active && "hidden",
        "flex flex-col gap-0.5 flex-1 relative overflow-auto scrollbar-hide cursor-pointer"
      )}
    >
      {orders.map((order, i) => {
        const price = order[0];
        const amount = order[1];
        const widthSize = `${volumeData[i]?.value || 1}%`;

        return (
          <div
            key={i}
            className="relative grid grid-cols-[30%_35%_35%] py-1"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChangeAllValues(i);
            }}
          >
            <div
              style={{ width: widthSize }}
              className={classNames(
                "absolute w-full h-full right-0",
                isSell ? "bg-danger-base/15" : "bg-success-base/15"
              )}
            />
            <Typography.Text
              appearance={isSell ? "danger" : "success"}
              size="xs"
              bold
              className="pl-2"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onChangePrice(i);
              }}
            >
              <Decimal fixed={pricePrecision} thousSep=",">
                {price}
              </Decimal>
            </Typography.Text>
            <Typography.Text
              size="xs"
              bold
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onChangeAmount(i);
              }}
              className="justify-self-end"
            >
              <Decimal fixed={qtyPrecision} thousSep=",">
                {amount}
              </Decimal>
            </Typography.Text>
            <Typography.Text
              size="xs"
              bold
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onChangeTotal(i);
              }}
              className="justify-self-end pr-2"
            >
              <Decimal fixed={pricePrecision} thousSep=",">
                {total[i]}
              </Decimal>
            </Typography.Text>
          </div>
        );
      })}
    </div>
  );
};
