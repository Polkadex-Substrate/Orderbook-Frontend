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

  // Price and Amount have NO cell-level handler: both bubble to the row, so
  // "take this order" is one rule that holds wherever you click in those two
  // columns.
  //
  // They used to handle their own clicks, which was unpredictable in practice.
  // Amount carried `justify-self-end`, shrinking the hit area to the width of
  // its digits - so a click landed on the cell or fell through to the row
  // depending on how many digits that row happened to render. Same pixel
  // column, different outcome per row, and it misfilled the form rather than
  // just misfiring the highlight.
  const onChangeAllValues: GenericAction = (selectedIndex) => {
    changeMarketPrice(selectedIndex, isSell ? "asks" : "bids");
    changeMarketAmount(selectedIndex, isSell ? "asks" : "bids");
    // Both fields, so a row click highlights both even if one value is
    // unchanged.
    notifyFill("price", "amount");
  };

  // Total is the one genuinely different action: it sweeps the book to this
  // depth (onSetCurrentTotal with the cumulative volume) rather than taking a
  // single order, so it keeps its own handler and stops propagation. It spans
  // its whole column so the hit area does not depend on digit count.
  const onChangeTotal: GenericAction = (selectedIndex) => {
    changeMarketAmountSumClick(selectedIndex);
    notifyFill("total");
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
            >
              <Decimal fixed={pricePrecision} thousSep=",">
                {price}
              </Decimal>
            </Typography.Text>
            <Typography.Text size="xs" bold className="w-full text-right">
              <Decimal fixed={qtyPrecision} thousSep=",">
                {amount}
              </Decimal>
            </Typography.Text>
            {/* w-full + text-right, NOT justify-self-end: the latter shrinks a
                grid item to its content, leaving the rest of the column as
                bare row. Looks identical, behaves consistently. */}
            <Typography.Text
              size="xs"
              bold
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onChangeTotal(i);
              }}
              className="w-full text-right pr-2"
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
