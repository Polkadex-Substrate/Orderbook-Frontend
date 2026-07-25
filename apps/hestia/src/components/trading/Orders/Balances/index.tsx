import { Fragment, useEffect, useMemo, useState } from "react";
import { useWindowSize } from "usehooks-ts";
import {
  SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import classNames from "classnames";
import { AssetsProps, useAssets } from "@orderbook/core/hooks";
import { GenericMessage, Table as PolkadexTable } from "@mitra/ux";

import { Loading } from "../loading";

import { columns } from "./columns";
import { ResponsiveTable } from "./responsiveTable";

const responsiveKeys = ["inOrders", "fundingAccount"];
const widthKeys = ["10%", "25%", "25%", "25%", "fit-content"];
const responsiveWidthKeys = ["30%", "auto", "65%"];

export const BalancesTable = ({ height }: { height: number }) => {
  const [responsiveState, setResponsiveState] = useState(false);
  const [responsiveData, setResponsiveData] = useState<AssetsProps | null>(
    null
  );

  const [sorting, setSorting] = useState<SortingState>([
    { desc: true, id: "fundingAccount" },
  ]);

  const { assets, loading } = useAssets();
  const { width } = useWindowSize();
  const table = useReactTable({
    data: assets,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const responsiveView = useMemo(
    () => width < 550 || (width >= 715 && width <= 1100),
    [width]
  );
  const isResponsive = useMemo(() => width <= 800, [width]);

  useEffect(() => {
    if (!responsiveView && !!responsiveState) {
      setResponsiveState(false);
      setResponsiveData(null);
    }
  }, [responsiveState, responsiveView]);

  if (loading) return <Loading />;

  if (!assets?.length)
    return (
      <GenericMessage
        title={"No assets found"}
        illustration="NoData"
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
      <div
        className="flex-1 h-full overflow-auto scrollbar-hide"
        style={{ maxHeight: height }}
      >
        <PolkadexTable className="w-full [&_th]:border-b [&_th]:border-primary mb-1">
          <PolkadexTable.Header className="sticky top-0 bg-level-0">
            {table.getHeaderGroups().map((headerGroup) => (
              <PolkadexTable.Row key={headerGroup.id}>
                {headerGroup.headers.map((header, i) => {
                  const getSorted = header.column.getIsSorted();
                  const isActionTab = header.id === "actions";
                  const handleSort = (): void => {
                    const isDesc = getSorted === "desc";
                    header.column.toggleSorting(!isDesc);
                  };
                  if (isResponsive && responsiveKeys.includes(header.id))
                    return null;

                  return (
                    <PolkadexTable.Head
                      key={header.id}
                      align={i === 0 ? "left" : "right"}
                      className={classNames(
                        "text-xs",
                        !isActionTab && "cursor-pointer"
                      )}
                      style={{
                        width: isResponsive
                          ? responsiveWidthKeys[i]
                          : widthKeys[i],
                      }}
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
                <PolkadexTable.Row key={row.id} className="hover:bg-level-1">
                  {row.getVisibleCells().map((cell, i) => {
                    if (isResponsive && responsiveKeys.includes(cell.column.id))
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
    </Fragment>
  );
};
