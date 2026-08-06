"use client";

import InfiniteScroll from "react-infinite-scroll-component";
import { Fragment, useEffect, useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import classNames from "classnames";
import {
  useCancelOrder,
  useOpenOrders,
  CancelOrderArgs,
  useCancelAllOrders,
} from "@orderbook/core/hooks";
import {
  GenericMessage,
  Modal,
  Table as PolkadexTable,
  Spinner,
} from "@polkadex/ux";
import { useWindowSize } from "usehooks-ts";
import { Ifilters } from "@orderbook/core/providers/types";
import { tryUnlockTradeAccount } from "@orderbook/core/helpers";
import { useConnectWalletProvider } from "@orderbook/core/providers/user/connectWalletProvider";
import { Order } from "@orderbook/core/utils/orderbookService/types";

import { Loading } from "../loading";

import { columns } from "./columns";
import { ResponsiveTable } from "./responsiveTable";

import { UnlockAccount } from "@/components/ui/ReadyToUse/unlockAccount";

const responsiveKeys = ["date", "price"];
const actionKeys = ["date", "price", "amount"];
const widthKeys = ["15%", "15%", "20%", "25%", "100%", "fit-content"];

export const OpenOrdersTable = ({
  filters,
  height,
}: {
  filters: Ifilters;
  height: number;
}) => {
  const { mutateAsync: cancelOrder } = useCancelOrder();
  const { selectedTradingAccount } = useConnectWalletProvider();
  const { isLoading, openOrders } = useOpenOrders(filters);
  const { mutateAsync: onCancelAllOrders } = useCancelAllOrders();
  const { width } = useWindowSize();

  const [showPassword, setShowPassword] = useState(false);
  const [orderPayload, setOrderPayload] = useState<CancelOrderArgs | null>(
    null
  );
  const [responsiveState, setResponsiveState] = useState(false);
  const [responsiveData, setResponsiveData] = useState<Order | null>(null);
  const responsiveView = useMemo(() => width < 500 || width <= 715, [width]);
  const markets = useMemo(() => openOrders.map((e) => e.market), [openOrders]);
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

  const table = useReactTable({
    data: openOrders,
    columns: columns({
      onCancelOrder,
      onCancelAllOrders,
      markets,
    }),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

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

  if (isLoading) return <Loading />;

  if (!openOrders.length)
    return (
      <GenericMessage
        title={"No items found"}
        illustration="NoData"
        className="bg-level-0"
        imageProps={{
          className: "w-10 self-center",
        }}
      />
    );

  return (
    <Fragment>
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
      <InfiniteScroll
        className="flex-1 h-full overflow-auto scrollbar-hide"
        dataLength={openOrders.length}
        next={() => {}}
        hasMore={false}
        loader={<Spinner.Keyboard className="h-6 mx-auto my-2" />}
        height={`${height}px`}
      >
        <PolkadexTable className="w-full [&_th]:border-b [&_th]:border-primary">
          <PolkadexTable.Header className="sticky top-0 bg-level-0 z-[2]">
            {table.getHeaderGroups().map((headerGroup) => (
              <PolkadexTable.Row key={headerGroup.id}>
                {headerGroup.headers.map((header, i) => {
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
                      key={header.id}
                      className={classNames(
                        "text-xs",
                        !isActionTab && "cursor-pointer"
                      )}
                      style={{ width: widthKeys[i] }}
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
                <PolkadexTable.Row key={row.id} className="hover:bg-level-1">
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
                      <PolkadexTable.Cell
                        key={cell.id}
                        className="text-xs"
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
      </InfiniteScroll>
    </Fragment>
  );
};
