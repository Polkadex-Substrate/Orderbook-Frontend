"use client";

import { Table, GenericMessage } from "@polkadex/ux";
import {
  forwardRef,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
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
import { useProfile } from "@orderbook/core/providers/user/profile";
import { Thea, getChainConnector } from "@polkadex/thea";
import { GENESIS } from "@orderbook/core/constants";

import { columns } from "./columns";
import { Filters } from "./filters";
import { ResponsiveTable } from "./responsiveTable";
import { SkeletonLoading } from "./loading";

import { Transaction, useTheaTransactions } from "@/hooks";

const actionKeys = ["token", "date"];
const responsiveKeys = ["date"];

const polkadexConnector = getChainConnector(GENESIS[0]);
const polkadexAssets =
  polkadexConnector
    ?.getAllAssets()
    .map((e) => (!e.id ? { ...e, id: "0" } : e)) || [];

const { getAllChains } = new Thea();
const chains = getAllChains();

const baseAssets = getAllChains()
  .filter((c) => c.genesis !== GENESIS[0])
  .map((e) => getChainConnector(e.genesis).getAllAssets())
  .flat();

export const History = forwardRef<
  HTMLDivElement,
  { maxHeight?: string; searchTerm: string }
>(({ searchTerm }, ref) => {
  const {
    selectedAddresses: { mainAddress },
  } = useProfile();

  const [
    {
      data: deposits = [],
      isLoading: depositsLoading,
      isRefetching: depositsRefetching,
      refetch: onDepositsRefetch,
    },
    {
      data: withdrawals = [],
      isLoading: withdrawalsLoading,
      isRefetching: withdrawalsRefetching,
      refetch: onWithdrawalsRefetch,
    },
  ] = useTheaTransactions({
    sourceAddress: mainAddress,
    assets: polkadexAssets,
    chains,
    baseAssets,
  });

  const [responsiveState, setResponsiveState] = useState(false);
  const [responsiveData, setResponsiveData] = useState<Transaction | null>(
    null
  );
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const { width } = useWindowSize();

  const onRefetch = useCallback(async () => {
    await onDepositsRefetch();
    await onWithdrawalsRefetch();
  }, [onDepositsRefetch, onWithdrawalsRefetch]);

  const data = useMemo(
    () =>
      [...withdrawals, ...deposits]
        ?.sort((a, b) => b.timestamp - a.timestamp)
        ?.filter((e) => {
          const search = searchTerm.toLowerCase();
          return (
            e.asset.ticker?.toLowerCase().includes(search) ||
            e.from?.name.toLowerCase().includes(search) ||
            e.to?.name.toLowerCase().includes(search)
          );
        }),
    [withdrawals, deposits, searchTerm]
  );
  const table = useReactTable({
    data,
    state: {
      columnFilters,
      sorting,
    },
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
    if (!responsiveView && !!responsiveState) {
      setResponsiveState(false);
      setResponsiveData(null);
    }
  }, [responsiveState, responsiveView]);

  if (depositsLoading || withdrawalsLoading) return <SkeletonLoading />;

  return (
    <Fragment>
      <ResponsiveTable
        data={responsiveData}
        onOpenChange={setResponsiveState}
        open={responsiveState}
      />
      <div className="flex-1 flex flex-col">
        <div ref={ref}>
          <Filters
            onRefetch={onRefetch}
            refetchingLoading={depositsRefetching || withdrawalsRefetching}
            data={data}
            chains={chains}
            assets={polkadexAssets}
            table={table}
            address={mainAddress}
          />
        </div>
        {data.length ? (
          <div className="flex-1 flex flex-col justify-between border-b border-secondary-base min-h-40">
            <div
              className="max-h-[400px] overflow-auto scrollbar-hide px-3"
              style={{
                maxHeight: "280px",
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
                              cell.getContext()
                            )}
                          </Table.Cell>
                        );
                      })}
                    </Table.Row>
                  ))}
                </Table.Body>
                <Table.Caption>
                  Deposits/Withdrawals history table
                </Table.Caption>
              </Table>
            </div>
          </div>
        ) : (
          <GenericMessage
            title="No result found"
            illustration="NoResultFound"
            className="bg-level-0 border-y border-y-primary"
            imageProps={{
              className: "w-10 self-center",
            }}
          />
        )}
      </div>
    </Fragment>
  );
});

History.displayName = "History";
