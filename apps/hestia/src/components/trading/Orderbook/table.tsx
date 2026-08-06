"use client";

import classNames from "classnames";
import { useOrderbookTable } from "@orderbook/core/hooks";
import { useRef } from "react";
import { GenericMessage, Typography } from "@polkadex/ux";
import { Decimal } from "@orderbook/core/utils";

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

  const onChangePrice: GenericAction = (selectedIndex) => {
    changeMarketPrice(selectedIndex, isSell ? "asks" : "bids");
  };

  const onChangeAmount: GenericAction = (selectedIndex) =>
    changeMarketAmount(selectedIndex, isSell ? "asks" : "bids");

  const onChangeTotal: GenericAction = (selectedIndex) =>
    changeMarketAmountSumClick(selectedIndex);

  const onChangeAllValues: GenericAction = (selectedIndex) => {
    changeMarketAmount(selectedIndex, isSell ? "asks" : "bids");
    changeMarketPrice(selectedIndex, isSell ? "asks" : "bids");
  };

  if (!active) return null;

  if (!orders.length)
    return (
      <GenericMessage
        title="No data"
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
