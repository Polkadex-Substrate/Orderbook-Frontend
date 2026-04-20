import { useAssets, useTransferHistory } from "@orderbook/core/hooks";
import { useProfile } from "@orderbook/core/providers/user/profile";
import { forwardRef, useEffect, useMemo, useState } from "react";
import { PALLET_ADDRESS } from "@orderbook/core/constants";
import { useExtensionAccounts } from "@polkadex/react-providers";
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
import { GenericMessage, Loading, Table } from "@polkadex/ux";
import classNames from "classnames";
import { useWindowSize } from "usehooks-ts";

import { SkeletonLoading } from "../loading";

import { TransferHistoryData, columns } from "./columns";
import ResponsiveTable from "./responsiveTable";
import { Filters } from "./filters";

import { defaultConfig } from "@/config";
import { TablePagination } from "@/components/ui";

type Props = { maxHeight: string; searchTerm: string };

const responsiveKeys = ["fees", "wallets", "hash"];
const actionKeys = ["date", "token", "amount"];

export const TransferHistory = forwardRef<HTMLDivElement, Props>(
  ({ maxHeight, searchTerm }, ref) => {
    const { width } = useWindowSize();

    const [sorting, setSorting] = useState<SortingState>([]);
    const [responsiveState, setResponsiveState] = useState(false);
    const [responsiveData, setResponsiveData] =
      useState<TransferHistoryData | null>(null);
    const responsiveView = useMemo(() => width <= 850, [width]);

    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

    const {
      selectedAddresses: { mainAddress },
    } = useProfile();
    const { selectGetAsset, assets } = useAssets();
    const { extensionAccounts } = useExtensionAccounts();
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [page, setPage] = useState(1);

    const { data, isLoading, isFetchingNextPage, fetchNextPage } =
      useTransferHistory(
        defaultConfig.subqueryUrl,
        mainAddress,
        mainAddress?.length > 0 && assets?.length > 0,
        rowsPerPage
      );
    const transactions = useMemo(
      () => data?.pages?.at(page - 1)?.transfers || [],
      [data?.pages, page]
    );
    const totalResultsCount = useMemo(
      () => data?.pages?.at(0)?.count || 0,
      [data?.pages]
    );

    const transactionsPerPage = useMemo(
      () =>
        transactions
          .map((e) => {
            const tokenId = e.asset_unique_id
              .split("standard_assets/")
              .join("");
            const token = selectGetAsset(tokenId);
            const fromData = extensionAccounts?.find(
              (from) => from.address === e.from
            );
            const toData = extensionAccounts?.find(
              (wallet) => wallet.address === e.to
            );

            let fromWalletType;
            let toWalletType;
            if (e.from !== PALLET_ADDRESS && e.to !== PALLET_ADDRESS) {
              fromWalletType = fromData?.name ?? "Custom Wallet";
              toWalletType = toData?.name ?? "Custom Wallet";
            } else {
              fromWalletType =
                e.from === PALLET_ADDRESS
                  ? "Trading Account"
                  : "Funding Account";
              toWalletType =
                e.to === PALLET_ADDRESS ? "Trading Account" : "Funding Account";
            }

            return {
              hash: e.hash,
              amount: e.amount,
              fee: (+e.fee / Math.pow(10, 12)).toFixed(3),
              time: new Date(e.block_timestamp * 1000),
              token: {
                ticker: token?.ticker || "Unknown",
                name: token?.name || "Unknown",
              },
              wallets: {
                fromType: fromWalletType,
                fromAddress: e.from,
                fromName: fromData?.name || "Custom Wallet",
                toType: toWalletType,
                toAddress: e.to,
                toName: toData?.name || "Custom Wallet",
              },
            } as TransferHistoryData;
          })
          .filter(
            (e) =>
              e.token.name.toLowerCase().includes(searchTerm) ||
              e.token.ticker.toLowerCase().includes(searchTerm) ||
              e.hash.includes(searchTerm)
          ),
      [extensionAccounts, searchTerm, selectGetAsset, transactions]
    );

    const availableTokens = useMemo(() => {
      const tickersSet = new Set(
        transactionsPerPage
          .map((v) => v.token.ticker)
          .filter((v) => v !== "Unknown")
          .concat(["Other"])
      );
      return Array.from(tickersSet);
    }, [transactionsPerPage]);

    const prevButtonDisabled = useMemo(() => page === 1, [page]);
    const nextButtonDisabled = useMemo(() => {
      const totalResultsForPreviousPages = rowsPerPage * (page - 1);
      const totalResultsForCurrentPage = transactionsPerPage?.length;
      return (
        totalResultsCount <=
        totalResultsForPreviousPages + totalResultsForCurrentPage
      );
    }, [page, rowsPerPage, totalResultsCount, transactionsPerPage?.length]);

    const onSetRowsPerPage = (row: number) => {
      setPage(1);
      setRowsPerPage(row);
    };

    const onPrevPage = () => {
      if (prevButtonDisabled) return;
      setPage(page - 1);
    };

    const onNextPage = async () => {
      if (nextButtonDisabled) return;
      await fetchNextPage();
      setPage(page + 1);
    };

    const table = useReactTable({
      data: transactionsPerPage,
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

    if (transactionsPerPage?.length === 0)
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
          <Filters table={table} availableTokens={availableTokens} />
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
                              key={header.id}
                              className={classNames(
                                "text-xs",
                                !isActionTab && "cursor-pointer"
                              )}
                              {...(isActionTab && { onClick: handleSort })}
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
                  totalResultCount={totalResultsCount}
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

TransferHistory.displayName = "TransferHistory";
