import { Button } from "@mitrabook/ux";
import { Table } from "@tanstack/react-table";
import CSVLink from "react-csv-downloader";
import { RiDownload2Line } from "@remixicon/react";

import { TransferHistoryData } from "./columns";

interface ExportProps<TData> {
  table: Table<TData>;
}

const csvColumns = [
  "date",
  "token",
  "amount",
  "fromName",
  "fromAddress",
  "toName",
  "toAddress",
  "hash",
].map((c) => ({
  id: c,
}));

export const Export = <TData,>({ table }: ExportProps<TData>) => {
  const exportedFileName = `Transfer_History_${new Date().getTime()}_Polkadex_Orderbook`;

  const prepareData = () => {
    const rows = table.getRowModel().rows.map((e) =>
      e
        .getVisibleCells()
        .map((v) => v.row.original)
        .at(0)
    ) as TransferHistoryData[];

    const data = rows.map((tx) => {
      return {
        date: tx.time.toLocaleString().replaceAll(",", ""),
        token: tx.token.ticker,
        amount: tx.amount,
        fromName: tx.wallets.fromName,
        fromAddress: tx.wallets.fromAddress,
        toName: tx.wallets.toName,
        toAddress: tx.wallets.toAddress,
        hash: tx.hash,
      };
    });

    return data;
  };

  return (
    <CSVLink
      columns={csvColumns}
      datas={prepareData}
      filename={exportedFileName}
    >
      <Button.Outline appearance="secondary" size="sm">
        <RiDownload2Line className="w-4 h-4 inline-block mr-1" />
        Export Page Data
      </Button.Outline>
    </CSVLink>
  );
};
