import { forwardRef, useEffect, useMemo, useState } from "react";
import { useWindowSize } from "usehooks-ts";
import classNames from "classnames";
import { Order } from "@orderbook/core/utils/orderbookService/types";
import {
  useCancelOrder,
  useOpenOrders,
  CancelOrderArgs,
  useCancelAllOrders,
} from "@orderbook/core/hooks";
import { GenericMessage, Loading, Modal, Table } from "@polkadex/ux";
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
import { useConnectWalletProvider } from "@orderbook/core/providers/user/connectWalletProvider";
import { tryUnlockTradeAccount } from "@orderbook/core/helpers";

import { SkeletonLoading } from "../loading";

import { columns } from "./columns";
import { ResponsiveTable } from "./responsiveTable";
import { Filters } from "./filters";

import { TablePagination } from "@/components/ui";
import { UnlockAccount } from "@/components/ui/ReadyToUse/unlockAccount";

type Props = {
  maxHeight: string;
  searchTerm: string;
};

const responsiveKeys = ["id", "filled", "date", "actions"];
const actionKeys = ["date", "price", "amount"];

export const OpenOrders = forwardRef<HTMLDivElement, Props>(
  ({ maxHeight, searchTerm }, ref) => {
    const { width } = useWindowSize();
    const { selectedTradingAccount } = useConnectWalletProvider();
    const { mutateAsync: cancelOrder } = useCancelOrder();
    const { mutateAsync: onCancelAllOrders } = useCancelAllOrders();

    const { isLoading, openOrders: allOpenOrders } = useOpenOrders(
      undefined,
      true
    );
    const [showPassword, setShowPassword] = useState(false);
    const [orderPayload, setOrderPayload] = useState<CancelOrderArgs | null>(
      null
    );
    const [responsiveState, setResponsiveState] = useState(false);
    const [responsiveData, setResponsiveData] = useState<Order | null>(null);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [sorting, setSorting] = useState<SortingState>([]);

    const [isFetchingNextPage, setIsfetchingNext] = useState(false);
    const [rowsPerPage, setRowsPerPage] = useState(15);
    const [page, setPage] = useState(1);

    const onCancelOrder = async (payload: CancelOrderArgs | null) => {
      if (!payload) return;
      if (selectedTradingAccount?.account?.isLocked) {
        setShowPassword(true);
        setOrderPayload(payload);
      } else {
        await cancelOrder(payload);
        setOrderPayload(null);
      }
    };

    const responsiveView = useMemo(() => width <= 850, [width]);
    const markets = useMemo(
      () => allOpenOrders.map((e) => e.market),
      [allOpenOrders]
    );

    const openOrdersPerPage = useMemo(
      () =>
        allOpenOrders
          .slice(rowsPerPage * (page - 1), rowsPerPage * page)
          .filter(
            (e) =>
              e.market.name
                .replace("/", "")
                .includes(searchTerm.toUpperCase()) ||
              e.orderId.includes(searchTerm) ||
              e.type.includes(searchTerm.toUpperCase())
          ),
      [allOpenOrders, page, rowsPerPage, searchTerm]
    );

    const availablePairs = useMemo(() => {
      const marketsSet = new Set(allOpenOrders.map((v) => v.market.name));
      return Array.from(marketsSet);
    }, [allOpenOrders]);

    const prevButtonDisabled = useMemo(() => page === 1, [page]);
    const nextButtonDisabled = useMemo(() => {
      const totalResultsForPreviousPages = rowsPerPage * (page - 1);
      const totalResultsForCurrentPage = openOrdersPerPage.length;
      return (
        allOpenOrders.length <=
        totalResultsForPreviousPages + totalResultsForCurrentPage
      );
    }, [allOpenOrders?.length, openOrdersPerPage?.length, page, rowsPerPage]);

    const table = useReactTable({
      data: openOrdersPerPage,
      state: { columnFilters, sorting },
      onSortingChange: setSorting,
      onColumnFiltersChange: setColumnFilters,
      getSortedRowModel: getSortedRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
      getFacetedRowModel: getFacetedRowModel(),
      getFacetedUniqueValues: getFacetedUniqueValues(),
      columns: columns({ onCancelOrder, onCancelAllOrders, markets }),
      getCoreRowModel: getCoreRowModel(),
    });

    const onSetRowsPerPage = async (row: number) => {
      setIsfetchingNext(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setPage(1);
      setRowsPerPage(row);
      setIsfetchingNext(false);
    };

    const onPrevPage = async () => {
      if (prevButtonDisabled) return;
      setIsfetchingNext(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setPage(page - 1);
      setIsfetchingNext(false);
    };

    const onNextPage = async () => {
      if (nextButtonDisabled) return;
      setIsfetchingNext(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setPage(page + 1);
      setIsfetchingNext(false);
    };

    useEffect(() => {
      if (selectedTradingAccount?.account)
        tryUnlockTradeAccount(selectedTradingAccount.account);
    }, [selectedTradingAccount?.account]);

    useEffect(() => {
      if (!responsiveView && !!responsiveState) {
        setResponsiveState(false);
        setResponsiveData(null);
      }
    }, [responsiveState, responsiveView]);

    if (isLoading) return <SkeletonLoading />;

    if (openOrdersPerPage?.length === 0)
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
        <Modal open={showPassword} onOpenChange={setShowPassword}>
          <Modal.Content>
            <UnlockAccount
              onClose={() => setShowPassword(false)}
              onAction={async () => await onCancelOrder(orderPayload)}
              tempBrowserAccount={selectedTradingAccount?.account}
            />
          </Modal.Content>
        </Modal>
        <ResponsiveTable
          data={responsiveData}
          onOpenChange={setResponsiveState}
          open={responsiveState}
          onCancelOrder={onCancelOrder}
        />
        <div className="flex-1 flex flex-col pt-1">
          <Filters
            table={table}
            availablePairs={availablePairs}
            allOpenOrders={allOpenOrders}
          />
          <div className="flex-1 flex flex-col justify-between border-b border-secondary-base">
            <Loading.Spinner active={isFetchingNextPage}>
              <div
                className="overflow-y-hidden hover:overflow-y-auto px-3"
                style={{ maxHeight, scrollbarGutter: "stable" }}
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
            </Loading.Spinner>
            <div className="[&_svg]:scale-150">
              <TablePagination
                totalResultCount={allOpenOrders.length}
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
          </div>
        </div>
      </>
    );
  }
);
OpenOrders.displayName = "OpenOrders";
