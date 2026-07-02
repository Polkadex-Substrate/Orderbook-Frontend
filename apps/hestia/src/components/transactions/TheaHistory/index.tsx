"use client";

import {
  forwardRef,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Table, GenericMessage } from "@polkadex/ux";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
} from "@tanstack/react-table";
import classNames from "classnames";
import { useWindowSize } from "usehooks-ts";
import { useCrossChainTransactions } from "@orderbook/core/hooks";
import { useProfile } from "@orderbook/core/providers/user/profile";

import { SkeletonLoading } from "../loading";

import { columns } from "./columns";
import { ResponsiveTable } from "./responsiveTable";

import { Transaction } from "@/hooks";

const actionKeys = ["token", "date"];
const responsiveKeys = ["hash", "date"];

export const TheaHistory = forwardRef<
  HTMLDivElement,
  { maxHeight?: string; searchTerm: string }
>(({ maxHeight, searchTerm }, ref) => {
  const {
    selectedAddresses: { mainAddress },
  } = useProfile();

  const [responsiveState, setResponsiveState] = useState(false);
  const [responsiveData, setResponsiveData] = useState<Transaction | null>(
    null,
  );
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const { width } = useWindowSize();

  const {
    data: transactions = [],
    isLoading,
    refetch,
    isRefetching,
  } = useCrossChainTransactions({
    address: mainAddress ?? "",
    enabled: !!mainAddress,
  });

  const onRefetch = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const data = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
        .filter((e) => {
          const search = searchTerm.toLowerCase();
          return (
            e.symbol?.toLowerCase().includes(search) ||
            e.sourceChain?.toLowerCase().includes(search) ||
            e.destinationChain?.toLowerCase().includes(search)
          );
        }),
    [transactions, searchTerm],
  );

  const table = useReactTable({
    data,
    state: { columnFilters, sorting },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const responsiveView = useMemo(() => width <= 1040, [width]);

  useEffect(() => {
    if (!responsiveView && responsiveState) {
      setResponsiveState(false);
      setResponsiveData(null);
    }
  }, [responsiveState, responsiveView]);

  if (isLoading) return <SkeletonLoading />;

  return (
    <Fragment>
      <ResponsiveTable
        data={responsiveData}
        onOpenChange={setResponsiveState}
        open={responsiveState}
      />
      <div className="flex-1 flex flex-col">
        <div ref={ref} className="flex items-center justify-end px-4 py-1.5">
          <button
            onClick={onRefetch}
            disabled={isRefetching}
            className="text-xs text-primary hover:text-current transition-colors"
          >
            {isRefetching ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        {data.length ? (
          <div className="flex-1 flex flex-col justify-between border-b border-secondary-base min-h-40">
            <div
              className="max-h-[400px] overflow-auto scrollbar-hide px-3"
              style={{
                maxHeight,
                scrollbarGutter: "stable",
                minHeight: "250px",
              }}
            >
              <Table>
                <Table.Header className="[&_th]:border-none">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <Table.Row
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

                        if (
                          responsiveView &&
                          responsiveKeys.includes(header.id)
                        )
                          return null;

                        return (
                          <Table.Head
                            key={header.id}
                            className={classNames(
                              isActionTab && "cursor-pointer",
                            )}
                            {...(isActionTab && { onClick: handleSort })}
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                            {isActionTab && <Table.Icon />}
                          </Table.Head>
                        );
                      })}
                    </Table.Row>
                  ))}
                </Table.Header>
                <Table.Body className="[&_tr]:border-none border-none">
                  {table.getRowModel().rows.map((row) => (
                    <Table.Row key={row.id}>
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
                          <Table.Cell key={cell.id} {...responsiveProps}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </Table.Cell>
                        );
                      })}
                    </Table.Row>
                  ))}
                </Table.Body>
                <Table.Caption>Cross-chain transaction history</Table.Caption>
              </Table>
            </div>
          </div>
        ) : (
          <GenericMessage
            title="No transactions found"
            illustration="NoResultFound"
            className="bg-level-0 border-y border-y-primary"
            imageProps={{ className: "w-10 self-center" }}
          />
        )}
      </div>
    </Fragment>
  );
});

TheaHistory.displayName = "TheaHistory";
