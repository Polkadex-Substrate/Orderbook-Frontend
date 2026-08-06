import {
  Button,
  Modal,
  Typography,
  Skeleton,
  Illustrations,
  GenericMessage,
  Table as PolkadexTable,
} from "@polkadex/ux";
import { RiCloseLine } from "@remixicon/react";
import { Dispatch, SetStateAction, useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import classNames from "classnames";
import { useMarkets } from "@orderbook/core/index";

import { ColumnSelector, columns } from "./columns";
import { Tickers } from "./tickers";
import { Filters } from "./filters";

export const ResponsiveMarket = ({
  market,
  open,
  onOpenChange,
}: {
  market: string;
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
}) => {
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
    () => loadingMarkets || !hasMarkets,
    [loadingMarkets, hasMarkets]
  );

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      placement="top right"
      closeOnClickOutside
      className="flex flex-col border-primary bg-level-0 sm:w-screen md:max-w-[500px] sm:min-w-[450px]  border-x h-full min-h-webKit overflow-x-hidden overflow-y-auto"
    >
      <Modal.Title className="flex justify-between items-center py-4 pl-4">
        <Typography.Text size="lg" bold>
          Markets
        </Typography.Text>
        <Button.Icon
          variant="ghost"
          size="lg"
          appearance="secondary"
          rounded
          onClick={() => onOpenChange(false)}
        >
          <RiCloseLine className="h-full w-full" />
        </Button.Icon>
      </Modal.Title>
      <Modal.Content className="flex-1 h-full flex flex-col overflow-hidden">
        <Filters
          onSearch={handleFieldChange}
          searchField={fieldValue.searchFieldValue}
          onChangeFavorite={handleShowFavourite}
          activeFavorite={fieldValue.showFavourite}
        />
        <Skeleton loading={loading} className="h-full">
          <div className="flex flex-col flex-1 border-t border-t-primary overflow-scroll scrollbar-hide bg-level-0">
            {!hasMarkets || !marketTokens.length ? (
              <GenericMessage {...messageProps} />
            ) : (
              <PolkadexTable className="w-full">
                <PolkadexTable.Header className="sticky top-0 bg-level-0">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <PolkadexTable.Row key={headerGroup.id}>
                      {headerGroup.headers.map((header) => {
                        return (
                          <PolkadexTable.Head
                            className={classNames(
                              header.id === "coin" ? "text-left" : "text-right",
                              "px-2 text-primary font-medium text-xs py-2"
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
                                handleChangeMarket(row.original.name, () =>
                                  onOpenChange(false)
                                )
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
            )}
          </div>
        </Skeleton>
        <Tickers
          tickers={marketTickers}
          activeTicker={fieldValue.marketsTabsSelected}
          onChangeTicker={handleMarketsTabsSelected}
          loading={loading}
        />
      </Modal.Content>
    </Modal>
  );
};
