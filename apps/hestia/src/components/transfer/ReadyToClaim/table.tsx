"use client";

import { Table as PolkadexTable } from "@mitra/ux";
import { useWindowSize } from "usehooks-ts";
import { PropsWithChildren, useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
} from "@tanstack/react-table";
import classNames from "classnames";

import { columns } from "./columns";

import { ReadyToClaimProps } from ".";

const responsiveKeys = ["wallets", "fees", "date"];
const actionKeys = ["token", "amount", "date"];

export const Table = ({
  data,
}: PropsWithChildren<{
  data: ReadyToClaimProps[];
}>) => {
  const { width } = useWindowSize();
  const responsiveView = useMemo(() => width <= 800, [width]);

  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex-1 flex flex-col">
      <PolkadexTable>
        <PolkadexTable.Header className="[&_th]:border-none">
          {table.getHeaderGroups().map((headerGroup) => (
            <PolkadexTable.Row
              key={headerGroup.id}
              className="border-none sticky top-0 bg-backgroundBase"
            >
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
                    key={header.id}
                    className={classNames(!isActionTab && "cursor-pointer")}
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
        <PolkadexTable.Body className="[&_tr]:border-none border-none">
          {table.getRowModel().rows.map((row) => (
            <PolkadexTable.Row key={row.id}>
              {row.getVisibleCells().map((cell) => {
                if (responsiveView && responsiveKeys.includes(cell.column.id))
                  return null;
                return (
                  <PolkadexTable.Cell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </PolkadexTable.Cell>
                );
              })}
            </PolkadexTable.Row>
          ))}
        </PolkadexTable.Body>
      </PolkadexTable>
    </div>
  );
};
