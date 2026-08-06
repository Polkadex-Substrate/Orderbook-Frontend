import { Table as PolkadexTable, GenericMessage } from "@polkadex/ux";
import { useWindowSize } from "usehooks-ts";
import { Fragment, forwardRef, useEffect, useMemo, useState } from "react";
import { LmpMarketConfig, useLmpMarkets } from "@orderbook/core/hooks";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import classNames from "classnames";
import { useRouter } from "next/navigation";

import { columns } from "./columns";
import { ResponsiveData } from "./responsiveData";

import { TablePagination } from "@/components/ui";
import { SkeletonCollection } from "@/components/ui/ReadyToUse";

const responsiveKeys = ["volume24h", "makerScore"];
const actionKeys = ["makerScore", "traderScore", "volume24h", "totalRewards"];

type Props = { maxHeight: string; selectedEpoch: number };

export const Table = forwardRef<HTMLDivElement, Props>(
  ({ maxHeight, selectedEpoch }, ref) => {
    const [responsiveState, setResponsiveState] = useState(false);
    const [responsiveData, setResponsiveData] =
      useState<LmpMarketConfig | null>(null);
    const { width } = useWindowSize();
    const responsiveView = useMemo(() => width <= 650, [width]);

    const { markets, isLoading } = useLmpMarkets(selectedEpoch);
    const router = useRouter();

    const table = useReactTable({
      data: markets as LmpMarketConfig[],
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

    if (isLoading)
      return (
        <div className="[&_div]:flex-auto">
          <SkeletonCollection className="h-16" rows={4} />
        </div>
      );

    if (!markets?.length)
      return (
        <GenericMessage
          title="No results found"
          illustration="NoResultFound"
          className="bg-level-0 border-b border-b-primary"
          imageProps={{
            className: "w-16 self-center",
          }}
        />
      );

    return (
      <Fragment>
        <ResponsiveData
          data={responsiveData}
          onOpenChange={setResponsiveState}
          open={responsiveState}
        />
        <div className="flex-1 flex flex-col justify-between border-b border-secondary-base">
          <div
            className="overflow-y-hidden hover:overflow-y-auto mt-1 px-2"
            style={{ maxHeight, scrollbarGutter: "stable" }}
          >
            <PolkadexTable className="w-full [&_th]:border-b [&_th]:border-primary">
              <PolkadexTable.Header className="sticky top-0 bg-backgroundBase z-[2]">
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
                            "text-xs",
                            !isActionTab && "cursor-pointer"
                          )}
                          key={header.id}
                          align={`${header.index ? "right" : "left"}`}
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
                        const baseTicker =
                          row.original.baseAsset?.ticker || "Unknown";
                        const quoteTicker =
                          row.original.quoteAsset?.ticker || "Unknown";

                        const link = `/rewards/${baseTicker}${quoteTicker}`;
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
                          : () => router.push(link);

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
          <div className="[&_svg]:scale-150">
            <TablePagination
              ref={ref}
              page={1}
              nextButtonDisabled
              prevButtonDisabled
            />
          </div>
        </div>
      </Fragment>
    );
  }
);

Table.displayName = "Table";
