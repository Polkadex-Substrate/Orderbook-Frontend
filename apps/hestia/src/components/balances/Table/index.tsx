import { Table as PolkadexTable, GenericMessage } from "@mitrabook/ux";
import { useWindowSize } from "usehooks-ts";
import { Fragment, useEffect, useMemo, useState } from "react";
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
import { Loading } from "./loading";
import { ResponsiveTable } from "./responsiveTable";

const responsiveKeys = ["inOrders", "fundingAccount"];

// Plain component: was forwardRef but ignored the ref and no caller
// passed one - triggered React's forwardRef-arity warning on mount.
export const Table = ({
  maxHeight,
  data,
  loading,
}: {
  maxHeight: string;
  data: AssetsProps[];
  loading: boolean;
}) => {
  const [responsiveState, setResponsiveState] = useState(false);
  const [responsiveData, setResponsiveData] = useState<AssetsProps | null>(
    null
  );

  const [sorting, setSorting] = useState<SortingState>([
    { desc: true, id: "fundingAccount" },
  ]);

  const { width } = useWindowSize();

  const newData = useMemo(
    () =>
      // No per-ticker rescaling: fetchOnChainBalance already divides by the
      // asset's on-chain decimals. The USDT picoScale branch here scaled it a
      // second time.
      data.map((item) => ({ ...item })),
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

  const responsiveView = useMemo(() => width <= 800, [width]);

  useEffect(() => {
    if (!responsiveView && !!responsiveState) {
      setResponsiveState(false);
      setResponsiveData(null);
    }
  }, [responsiveState, responsiveView]);

  if (loading) return <Loading />;

  return (
    <Fragment>
      <ResponsiveTable
        data={responsiveData}
        onOpenChange={setResponsiveState}
        open={responsiveState}
      />
      {data?.length ? (
        <div className="flex-1 flex flex-col justify-between border-b border-secondary-base bg-level-0">
          <div
            className="overflow-y-hidden hover:overflow-y-auto px-3 min-h-[300px]"
            style={{ maxHeight, scrollbarGutter: "stable" }}
          >
            <PolkadexTable className="w-full [&_th]:border-b [&_th]:border-primary">
              <PolkadexTable.Header>
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
                      if (responsiveView && responsiveKeys.includes(header.id))
                        return null;
                      return (
                        <PolkadexTable.Head
                          key={header.id}
                          align={i === 0 ? "left" : "right"}
                          className={classNames(
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
              <PolkadexTable.Body>
                {table.getRowModel().rows.map((row) => {
                  return (
                    <PolkadexTable.Row key={row.id}>
                      {row.getVisibleCells().map((cell, i) => {
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
                            align={i === 0 ? "left" : "right"}
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
          </div>
        </div>
      ) : (
        <GenericMessage
          title="No result found"
          illustration="NoResultFound"
          className="bg-level-1"
          imageProps={{
            className: "w-10 self-center",
          }}
        />
      )}
    </Fragment>
  );
};
