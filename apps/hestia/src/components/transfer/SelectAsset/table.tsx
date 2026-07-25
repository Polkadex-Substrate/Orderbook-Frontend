import { GenericMessage, Table as PolkadexTable, Skeleton } from "@mitra/ux";
import { Fragment, useMemo, useState } from "react";
import { AssetsProps } from "@orderbook/core/hooks";
import {
  SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import classNames from "classnames";

import { columns } from "./columns";

import { FilteredAssetProps } from "@/hooks";
import { picoScale } from "@/helpers";

// Plain component: this was wrapped in forwardRef but ignored the ref (no
// caller ever passed one), which triggered React's "render functions accept
// exactly two parameters" warning on every mount.
export const Table = ({
  maxHeight,
  data,
  loading,
  selectedAssetId,
  onChangeAsset,
}: {
  maxHeight?: string;
  data: AssetsProps[];
  loading: boolean;
  selectedAssetId: string;
  onChangeAsset: (e: FilteredAssetProps) => void;
}) => {
  const [sorting, setSorting] = useState<SortingState>([
    { desc: true, id: "fundingAccount" },
  ]);

  const newData = useMemo(
    () =>
      data.map((item) =>
        item?.ticker === "USDT"
          ? { ...item, onChainBalance: picoScale(item?.onChainBalance) }
          : { ...item }
      ),
    [data]
  );

  const table = useReactTable({
    data: newData,
    state: { sorting },
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (loading)
    return (
      <div className="flex-1 flex flex-col gap-3 p-3">
        {new Array(8).fill("").map((_, i) => (
          <Skeleton key={i} loading className="flex-1 w-full h-5" />
        ))}
      </div>
    );
  return (
    <Fragment>
      {data?.length ? (
        <div className="flex-1 flex flex-col justify-between border-b border-secondary-base bg-level-0">
          <div
            className="overflow-y-hidden hover:overflow-y-auto px-3 min-h-[300px]"
            style={{ maxHeight, scrollbarGutter: "stable" }}
          >
            <PolkadexTable>
              <PolkadexTable.Header className="[&_th]:border-none">
                {table.getHeaderGroups().map((headerGroup) => (
                  <PolkadexTable.Row
                    key={headerGroup.id}
                    className="border-none"
                  >
                    {headerGroup.headers.map((header, i) => {
                      const getSorted = header.column.getIsSorted();
                      const isActionTab = header.id === "actions";
                      const handleSort = (): void => {
                        const isDesc = getSorted === "desc";
                        header.column.toggleSorting(!isDesc);
                      };
                      return (
                        <PolkadexTable.Head
                          key={header.id}
                          align={i === 0 ? "left" : "right"}
                          className={classNames(
                            "whitespace-nowrap",
                            !isActionTab && "cursor-pointer"
                          )}
                          {...(!isActionTab && { onClick: handleSort })}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                          {!isActionTab && <PolkadexTable.Icon />}
                        </PolkadexTable.Head>
                      );
                    })}
                  </PolkadexTable.Row>
                ))}
              </PolkadexTable.Header>
              <PolkadexTable.Body className="[&_tr]:border-none border-none">
                {table.getRowModel().rows.map((row) => {
                  const active = row.original.id === selectedAssetId;

                  return (
                    <PolkadexTable.Row
                      key={row.id}
                      className={classNames(
                        "cursor-pointer hover:bg-level-1",
                        active && "bg-level-2 hover:bg-level-2"
                      )}
                      onClick={() =>
                        onChangeAsset({
                          onChainBalance: row.original.onChainBalance,
                          free_balance: row.original.free_balance,
                          id: row.original.id,
                          name: row.original.name,
                          ticker: row.original.ticker,
                          decimal: row.original.decimal,
                        })
                      }
                    >
                      {row.getVisibleCells().map((cell, i) => {
                        return (
                          <PolkadexTable.Cell
                            key={cell.id}
                            align={i === 0 ? "left" : "right"}
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
        </div>
      ) : (
        <GenericMessage
          title="No assets found"
          illustration="NoData"
          className="bg-level-0"
          imageProps={{
            className: "w-16 self-center",
          }}
        />
      )}
    </Fragment>
  );
};
