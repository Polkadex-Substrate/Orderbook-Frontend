import { exportTradeHistory } from "@orderbook/core/helpers";
import { useSettingsProvider } from "@orderbook/core/providers/public/settings";
import { useProfile } from "@orderbook/core/providers/user/profile";
import { Button, Tooltip, Typography } from "@mitra/ux";
import { useState } from "react";
import CSVLink from "react-csv-downloader";
import { endOfDay, subMonths } from "date-fns";
import { RiDownload2Line } from "@remixicon/react";

const csvColumns = ["tradeId", "date", "pair", "type", "price", "amount"].map(
  (c) => ({
    id: c,
  })
);

export const Export = () => {
  const exportedFileName = `Trade_History_${new Date().getTime()}_Polkadex_Orderbook`;
  const [loading, setLoading] = useState(false);
  const {
    selectedAddresses: { mainAddress },
  } = useProfile();
  const { onHandleAlert, onHandleError, onHandleInfo } = useSettingsProvider();

  const prepareData = async () => {
    setLoading(true);
    onHandleInfo?.("Gettting data ready...");
    try {
      const now = new Date();
      const dateFrom = subMonths(now, 6);
      const dateTo = endOfDay(now);
      const allTradeHistory = await exportTradeHistory(
        mainAddress,
        dateFrom,
        dateTo
      );
      onHandleAlert("Trade history exported successfully...");
      return allTradeHistory?.map((order) => {
        const isSell = order.side === "Ask";
        const type = isSell ? "SELL" : "BUY";
        return {
          tradeId: order.tradeId,
          date: order.timestamp.toLocaleString().replaceAll(",", ""),
          pair: order.market.name,
          type,
          price: String(order.price),
          amount: String(order.qty),
        };
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <CSVLink
      columns={csvColumns}
      datas={prepareData}
      filename={exportedFileName}
      handleError={(e) =>
        onHandleError(`Some error occured: ${(e as Error).message}`)
      }
    >
      <Tooltip>
        <Tooltip.Trigger>
          <Button.Outline appearance="secondary" size="sm" disabled={loading}>
            <RiDownload2Line className="w-4 h-4 inline-block mr-1" />
            {loading ? "Exporting..." : "Export"}
          </Button.Outline>
        </Tooltip.Trigger>
        <Tooltip.Content side="left" className="px-2 py-1">
          <Typography.Text size="sm" appearance="primary">
            * Last 6 months
          </Typography.Text>
        </Tooltip.Content>
      </Tooltip>
    </CSVLink>
  );
};
