import CSVLink from "react-csv-downloader";
import { Button } from "@mitra/ux";
import { Order } from "@orderbook/core/utils/orderbookService/types";
import { useCallback } from "react";
import { RiDownload2Line } from "@remixicon/react";

const csvColumns = [
  "orderId",
  "date",
  "pair",
  "type",
  "price",
  "amount",
  "filled",
].map((c) => ({ id: c }));

type Props = { allOpenOrders: Order[] };

export const Export = ({ allOpenOrders }: Props) => {
  const exportedFileName = `Open_Orders_${new Date().getTime()}_Polkadex_Orderbook`;

  const computeData = useCallback(() => {
    const data = allOpenOrders.map((order) => {
      const isSell = order.side === "Ask";
      const type = `${order.type}/${isSell ? "SELL" : "BUY"}`;
      return {
        orderId: order.orderId,
        date: order.timestamp.toLocaleString().replaceAll(",", ""),
        pair: order.market.name,
        type,
        price: String(order.price),
        amount: order.quantity,
        filled: order.filledQuantity,
      };
    });
    return data;
  }, [allOpenOrders]);

  return (
    <CSVLink
      columns={csvColumns}
      datas={computeData}
      filename={exportedFileName}
    >
      <Button.Outline appearance="secondary" size="sm">
        <RiDownload2Line className="w-4 h-4 inline-block mr-1" />
        Export
      </Button.Outline>
    </CSVLink>
  );
};
