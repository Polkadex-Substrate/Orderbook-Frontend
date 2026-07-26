"use client";
import InfiniteScroll from "react-infinite-scroll-component";
import { Fragment, useMemo, useState } from "react";
import { useWindowSize } from "usehooks-ts";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import classNames from "classnames";
import {
  Button,
  GenericMessage,
  Table as PolkadexTable,
  Spinner,
} from "@mitrabook/ux";
import { useTradeHistory } from "@orderbook/core/hooks";
import { Ifilters } from "@orderbook/core/providers/types";
import { DEFAULT_BATCH_LIMIT } from "@orderbook/core/constants";
import { Trade } from "@orderbook/core/utils/orderbookService/types";

import { Loading } from "../loading";

import { columns } from "./columns";
import { ResponsiveTable } from "./responsiveTable";
const responsiveKeys = ["type", "price"];
const actionKeys = ["date", "price", "amount", "fee"];
const widthKeys = ["20%", "20%", "20%", "20%", "20%"];

export const TradeHistoryTable = ({
  filters,
  height,
}: {
  filters: Ifilters;
  height: number;
}) => {
  const { isLoading, trades, hasNextPage, onFetchNextPage, error } =
    useTradeHistory(DEFAULT_BATCH_LIMIT, filters);
  const { width } = useWindowSize();
  const table = useReactTable({
    data: trades,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const [responsiveState, setResponsiveState] = useState(false);
  const [responsiveData, setResponsiveData] = useState<Trade | null>(null);
  const responsiveView = useMemo(() => width < 500 || width <= 715, [width]);

  if (isLoading) return <Loading />;

  if (!trades.length)
    return (
      <GenericMessage
        title={"No items found"}
        illustration="NoData"
        className="bg-level-0"
        imageProps={{
          className: "w-10 self-center",
        }}
      />
    );

  return (
    <Fragment>
      <ResponsiveTable
        data={responsiveData}
        onOpenChange={setResponsiveState}
        open={responsiveState}
      />
      <InfiniteScroll
        className="flex-1 h-full min-h-0 overflow-auto scrollbar-hide"
        dataLength={trades.length}
        next={() => {
          onFetchNextPage();
        }}
        hasMore={Boolean(hasNextPage)}
        loader={<Spinner.Keyboard className="h-6 mx-auto my-2" />}
        height={`${height}px`}
      >
        <PolkadexTable className="w-full [&_th]:border-b [&_th]:border-primary">
          <PolkadexTable.Header className="sticky top-0 bg-level-0 z-[2]">
            {table.getHeaderGroups().map((headerGroup) => (
              <PolkadexTable.Row key={headerGroup.id}>
                {headerGroup.headers.map((header, i) => {
                  const getSorted = header.column.getIsSorted();
                  const isActionTab = actionKeys.includes(header.id);
                  const handleSort = (): void => {
                    const isDesc = getSorted === "desc";
                    header.column.toggleSorting(!isDesc);
                  };
                  if (responsiveView && responsiveKeys.includes(header.id))
                    return null;
                  return (
                    <PolkadexTable.Head
                      key={header.id}
                      className={classNames(
                        "text-xs",
                        !isActionTab && "cursor-pointer"
                      )}
                      style={{ width: widthKeys[i] }}
                      {...(isActionTab && { onClick: handleSort })}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {isActionTab && <PolkadexTable.Icon />}
                    </PolkadexTable.Head>
                  );
                })}
              </PolkadexTable.Row>
            ))}
          </PolkadexTable.Header>
          <PolkadexTable.Body>
            {table.getRowModel().rows.map((row) => {
              return (
                <PolkadexTable.Row
                  key={row.id}
                  className={classNames("hover:bg-level-1")}
                >
                  {row.getVisibleCells().map((cell) => {
                    if (
                      responsiveView &&
                      responsiveKeys.includes(cell.column.id)
                    )
                      return null;

                    const responsiveProps = responsiveView
                      ? {
                          className: "cursor-pointer",
                          onClick: () => {
                            setResponsiveState(true);
                            setResponsiveData(row.original);
                          },
                        }
                      : {};
                    return (
                      <PolkadexTable.Cell
                        key={cell.id}
                        className={classNames("text-xs")}
                        {...responsiveProps}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </PolkadexTable.Cell>
                    );
                  })}
                </PolkadexTable.Row>
              );
            })}
          </PolkadexTable.Body>
        </PolkadexTable>
        {!isLoading && error && (
          <div className="flex flex-col items-center justify-center gap-2">
            <p>{error}</p>
            <Button.Solid onClick={() => onFetchNextPage()} size="sm">
              Try again
            </Button.Solid>
          </div>
        )}
      </InfiniteScroll>
    </Fragment>
  );
};
