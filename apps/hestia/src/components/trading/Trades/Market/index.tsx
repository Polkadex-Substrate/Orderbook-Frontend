import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import classNames from "classnames";
import { useMarkets } from "@orderbook/core/index";
import {
  Skeleton,
  Illustrations,
  GenericMessage,
  Table as PolkadexTable,
} from "@polkadex/ux";
import { useMemo, useState } from "react";

import { ColumnSelector, columns } from "./columns";
import { Tickers } from "./tickers";
import { Filters } from "./filters";

export const Markets = ({ market }: { market: string }) => {
  const [state, setState] = useState<ColumnSelector>("price");
  const {
    marketTokens,
    marketTickers,
    handleChangeMarket,
    handleFieldChange,
    handleMarketsTabsSelected,
    handleSelectedFavorite,
    fieldValue,
    handleShowFavourite,
    id,
    list,
    loading: loadingMarkets,
    tickerLoading,
  } = useMarkets(market);

  const hasMarkets = !!list?.length;
  const table = useReactTable({
    data: marketTokens,
    columns: columns({
      isPrice: state === "price",
      onChangeFavourite: handleSelectedFavorite,
      setState,
    }),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const messageProps: {
    title: string;
    illustration: keyof typeof Illustrations;
  } = !hasMarkets
    ? { title: "No markets", illustration: "NoData" }
    : { title: "No result found", illustration: "NoResultFound" };

  const loading = useMemo(
    () => loadingMarkets || tickerLoading || !hasMarkets,
    [loadingMarkets, hasMarkets, tickerLoading]
  );

  return (
    <div className="flex-1 h-full flex flex-col justify-between">
      <Filters
        onSearch={handleFieldChange}
        searchField={fieldValue.searchFieldValue}
        onChangeFavorite={handleShowFavourite}
        activeFavorite={fieldValue.showFavourite}
      />
      <Skeleton loading={loading} className="h-full">
        <div className="flex flex-col flex-1 border-t border-t-primary overflow-scroll scrollbar-hide">
          {!hasMarkets || !marketTokens.length ? (
            <GenericMessage {...messageProps} />
          ) : (
            <div className="pb-10">
              <PolkadexTable className="w-full overflow-scroll z-[2]">
                <PolkadexTable.Header className="sticky top-0 bg-level-0">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <PolkadexTable.Row key={headerGroup.id}>
                      {headerGroup.headers.map((header) => {
                        return (
                          <PolkadexTable.Head
                            className={classNames(
                              header.id === "coin" ? "text-left" : "text-right",
                              "px-2 text-primary font-medium text-xs py-2 whitespace-nowrap"
                            )}
                            key={header.id}
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
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
                        className="hover:bg-level-1 cursor-pointer"
                      >
                        {row.getVisibleCells().map((cell, i) => {
                          const firstCol = i === 0;
                          const lastCol = i === 2;
                          const active = row.original.id === id;

                          return (
                            <PolkadexTable.Cell
                              className={classNames(
                                firstCol ? "text-left" : "text-right",
                                firstCol && "font-semibold",
                                lastCol && "text-primary",
                                active && "bg-level-1",
                                "px-2 py-1 text-xs"
                              )}
                              key={cell.id}
                              role="button"
                              onClick={() =>
                                handleChangeMarket(row.original.name, () => {})
                              }
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
          )}
        </div>
      </Skeleton>

      <Tickers
        tickers={marketTickers}
        activeTicker={fieldValue.marketsTabsSelected}
        onChangeTicker={handleMarketsTabsSelected}
        loading={loading}
      />
    </div>
  );
};
