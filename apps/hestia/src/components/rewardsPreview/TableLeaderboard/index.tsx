"use client";

import {
  GenericMessage,
  Skeleton,
  Table as PolkadexTable,
} from "@mitrabook/ux";
import { useWindowSize } from "usehooks-ts";
import { useEffect, useMemo, useState } from "react";
import { LmpLeaderboard, useLeaderBoard } from "@orderbook/core/hooks";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import classNames from "classnames";

import { ResponsiveTable } from "./responsiveTable";
import { columns } from "./column";

type Props = { market: string; maxHeight: string };

const responsiveKeys = ["mmScore", "tradingScore"];
const actionKeys = ["mmScore", "tradingScore", "rewards"];

// Plain component: was forwardRef but ignored the ref and no caller
// passed one - triggered React's forwardRef-arity warning on mount.
export const TableLeaderboard = ({ maxHeight, market }: Props) => {
  const { width } = useWindowSize();
  const { accounts, isLoading } = useLeaderBoard(market);

  const [responsiveState, setResponsiveState] = useState(false);
  const [responsiveData, setResponsiveData] = useState<LmpLeaderboard | null>(
    null
  );
  const responsiveView = useMemo(() => width <= 550, [width]);

  const table = useReactTable({
    data: accounts || [],
    columns: columns(),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  useEffect(() => {
    if (!responsiveView && !!responsiveState) {
      setResponsiveState(false);
      setResponsiveData(null);
    }
  }, [responsiveState, responsiveView]);

  return (
    <>
      <ResponsiveTable
        data={responsiveData}
        onOpenChange={setResponsiveState}
        open={responsiveState}
      />
      <div className="flex h-full min-h-[440px] flex-col justify-between border-b border-secondary-base">
        {isLoading ? (
          <Skeleton loading />
        ) : !accounts || accounts?.length === 0 ? (
          <GenericMessage
            title="No results found"
            illustration="NoResultFound"
            className="bg-level-1 border-b border-b-primary"
            imageProps={{
              className: "w-16 self-center",
            }}
          />
        ) : (
          <div
            className="overflow-y-hidden hover:overflow-y-auto mt-1 px-2"
            style={{ maxHeight, scrollbarGutter: "stable" }}
          >
            <PolkadexTable className="w-full [&_th]:border-b [&_th]:border-primary">
              <PolkadexTable.Header className="sticky top-0 bg-backgroundBase">
                {table.getHeaderGroups().map((headerGroup) => (
                  <PolkadexTable.Row key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
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
                          className={classNames(
                            "text-xs whitespace-nowrap",
                            !isActionTab && "cursor-pointer"
                          )}
                          key={header.id}
                          align={`${header.index > 1 ? "right" : "left"}`}
                          {...(isActionTab && { onClick: handleSort })}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
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
                      className={classNames("hover:bg-level-1 cursor-pointer")}
                    >
                      {row.getVisibleCells().map((cell) => {
                        if (
                          responsiveView &&
                          responsiveKeys.includes(cell.column.id)
                        )
                          return null;

                        const onClickAction = responsiveView
                          ? () => {
                              setResponsiveState(true);
                              setResponsiveData(row.original);
                            }
                          : () => {};

                        return (
                          <PolkadexTable.Cell
                            key={cell.id}
                            align="right"
                            onClick={onClickAction}
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
          </div>
        )}
      </div>
    </>
  );
};
