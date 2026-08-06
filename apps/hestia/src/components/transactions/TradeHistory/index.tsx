import { useTradeHistory } from "@orderbook/core/hooks";
import { GenericMessage, Loading, Table } from "@mitrabook/ux";
import { forwardRef, useEffect, useMemo, useState } from "react";
import { useWindowSize } from "usehooks-ts";
import classNames from "classnames";
import {
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Trade } from "@orderbook/core/utils/orderbookService/types";

import { SkeletonLoading } from "../loading";

import { columns } from "./columns";
import { ResponsiveTable } from "./responsiveTable";
import { Filters } from "./filters";

import { TablePagination } from "@/components/ui";

type Props = {
  maxHeight: string;
  searchTerm: string;
};

const responsiveKeys = ["id", "date"];
const actionKeys = ["price", "date", "amount"];

export const TradeHistory = forwardRef<HTMLDivElement, Props>(
  ({ maxHeight, searchTerm }, ref) => {
    const { width } = useWindowSize();
    const [rowsPerPage, setRowsPerPage] = useState(15);
    const [page, setPage] = useState(1);

    const responsiveView = useMemo(() => width <= 600, [width]);
    const [responsiveState, setResponsiveState] = useState(false);
    const [responsiveData, setResponsiveData] = useState<Trade | null>(null);
    const [sorting, setSorting] = useState<SortingState>([]);

    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

    const {
      isLoading,
      trades: allTradeHistory,
      isFetchingNextPage,
      hasNextPage,
      onFetchNextPage,
    } = useTradeHistory(rowsPerPage, undefined, true);

    const tradeHistoryPerPage = useMemo(
      () =>
        allTradeHistory
          .slice(rowsPerPage * (page - 1), rowsPerPage * page)
          .filter(
            (e) =>
              e.market.name
                .replace("/", "")
                .includes(searchTerm.toUpperCase()) ||
              e.tradeId.includes(searchTerm)
          ),
      [allTradeHistory, page, rowsPerPage, searchTerm]
    );

    const availablePairs = useMemo(() => {
      const marketsSet = new Set(allTradeHistory.map((v) => v.market.name));
      return Array.from(marketsSet);
    }, [allTradeHistory]);

    const prevButtonDisabled = useMemo(() => page === 1, [page]);
    const nextButtonDisabled = useMemo(() => {
      const totalResultsForPreviousPages = rowsPerPage * (page - 1);
      const totalResultsForCurrentPage = tradeHistoryPerPage?.length;

      if (hasNextPage) return false;
      return (
        allTradeHistory.length <=
        totalResultsForPreviousPages + totalResultsForCurrentPage
      );
    }, [
      allTradeHistory.length,
      hasNextPage,
      page,
      rowsPerPage,
      tradeHistoryPerPage?.length,
    ]);

    const onSetRowsPerPage = async (row: number) => {
      setPage(1);
      setRowsPerPage(row);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    };

    const onPrevPage = () => {
      if (prevButtonDisabled) return;
      setPage(page - 1);
    };

    const onNextPage = async () => {
      if (nextButtonDisabled) return;
      await onFetchNextPage();
      setPage(page + 1);
    };

    const table = useReactTable({
      data: tradeHistoryPerPage,
      state: { columnFilters, sorting },
      onSortingChange: setSorting,
      onColumnFiltersChange: setColumnFilters,
      getSortedRowModel: getSortedRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
      getFacetedRowModel: getFacetedRowModel(),
      getFacetedUniqueValues: getFacetedUniqueValues(),
      columns: columns(),
      getCoreRowModel: getCoreRowModel(),
    });

    useEffect(() => {
      if (!responsiveView && !!responsiveState) {
        setResponsiveState(false);
        setResponsiveData(null);
      }
    }, [responsiveState, responsiveView]);

    if (isLoading) return <SkeletonLoading />;

    if (tradeHistoryPerPage?.length === 0)
      return (
        <GenericMessage
          title="No results found"
          illustration="NoResultFound"
          className="bg-level-1 border-b border-b-primary"
          imageProps={{
            className: "w-20 self-center",
          }}
        />
      );

    return (
      <>
        <ResponsiveTable
          data={responsiveData}
          onOpenChange={setResponsiveState}
          open={responsiveState}
        />
        <div className="flex-1 flex flex-col pt-1">
          <Filters table={table} availablePairs={availablePairs} />
          <div className="flex-1 flex flex-col justify-between border-b border-secondary-base">
            <Loading.Spinner active={isFetchingNextPage}>
              <div
                className="overflow-y-hidden hover:overflow-y-auto px-3"
                style={{ height: maxHeight, scrollbarGutter: "stable" }}
              >
                <Table
                  className={classNames(
                    "w-full",
                    isFetchingNextPage && "opacity-50"
                  )}
                  even
                >
                  <Table.Header className="sticky top-0 bg-backgroundBase z-[2]">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <Table.Row key={headerGroup.id}>
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
                              className={classNames(
                                "text-xs",
                                !isActionTab && "cursor-pointer"
                              )}
                              {...(isActionTab && { onClick: handleSort })}
                              key={header.id}
                            >
                              {header.isPlaceholder
                                ? null
                                : flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )}
                              {isActionTab && <Table.Icon />}
                            </Table.Head>
                          );
                        })}
                      </Table.Row>
                    ))}
                  </Table.Header>
                  <Table.Body>
                    {table.getRowModel().rows.map((row) => {
                      return (
                        <Table.Row
                          key={row.id}
                          className={classNames(
                            "hover:bg-level-1 cursor-pointer"
                          )}
                        >
                          {row.getVisibleCells().map((cell) => {
                            if (
                              responsiveView &&
                              responsiveKeys.includes(cell.column.id)
                            )
                              return null;

                            const responsiveProps = responsiveView
                              ? {
                                  className: "cursor-pointer py-4",
                                  onClick: () => {
                                    setResponsiveState(true);
                                    setResponsiveData(row.original);
                                  },
                                }
                              : {};

                            return (
                              <Table.Cell
                                key={cell.id}
                                className={classNames("px-2 py-4 text-xs")}
                                {...responsiveProps}
                              >
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext()
                                )}
                              </Table.Cell>
                            );
                          })}
                        </Table.Row>
                      );
                    })}
                  </Table.Body>
                </Table>
              </div>
              <div className="[&_svg]:scale-150">
                <TablePagination
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onSetRowsPerPage={onSetRowsPerPage}
                  onNextPage={onNextPage}
                  onPrevPage={onPrevPage}
                  prevButtonDisabled={prevButtonDisabled}
                  nextButtonDisabled={nextButtonDisabled}
                  ref={ref}
                />
              </div>
            </Loading.Spinner>
          </div>
        </div>
      </>
    );
  }
);
TradeHistory.displayName = "TradeHistory";
