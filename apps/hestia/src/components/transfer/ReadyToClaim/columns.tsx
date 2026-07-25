import { createColumnHelper } from "@tanstack/react-table";
import { Tokens, Tooltip, Typography, truncateString } from "@mitra/ux";
import { getChainFromTicker } from "@orderbook/core/helpers";
import { RiArrowRightLine } from "@remixicon/react";

import { ReadyToClaimProps } from ".";

import { TokenCard } from "@/components/ui/ReadyToUse";

const columnHelper = createColumnHelper<ReadyToClaimProps>();

export const columns = [
  columnHelper.accessor((row) => row, {
    id: "token",
    cell: (e) => {
      const tokenTicker = e.getValue().token.ticker;
      const name = getChainFromTicker(tokenTicker);
      return (
        <TokenCard
          tokenName={name}
          ticker={tokenTicker}
          icon={tokenTicker as keyof typeof Tokens}
        />
      );
    },
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        Token
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
  }),
  columnHelper.accessor((row) => row.amount, {
    id: "amount",
    cell: (e) => <Typography.Text size="sm">{e.getValue()}</Typography.Text>,
    header: () => (
      <Typography.Text size="sm" appearance="primary">
        Amount
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
  }),
  columnHelper.accessor((row) => row.wallets, {
    id: "wallets",
    cell: (e) => {
      const address = truncateString(e.getValue().fromWalletAddress);
      return (
        <div className="flex items-center gap-2">
          {e.getValue().fromWalletType === "Trading Account" ? (
            <Typography.Text>{e.getValue().fromWalletType}</Typography.Text>
          ) : (
            <Tooltip>
              <Tooltip.Trigger className="flex items-center gap-1">
                <Typography.Text>{e.getValue().fromWalletType}</Typography.Text>
              </Tooltip.Trigger>
              <Tooltip.Content>
                <div className="flex items-center gap-2">
                  <Typography.Text>
                    {e.getValue().fromWalletName}
                  </Typography.Text>
                  <Typography.Text appearance="primary">
                    {address}
                  </Typography.Text>
                </div>
              </Tooltip.Content>
            </Tooltip>
          )}

          <div className="flex items-center justify-center bg-level-1 w-6 h-6 rounded-md">
            <RiArrowRightLine className="w-4 h-4 text-primary" />
          </div>
          <Tooltip>
            <Tooltip.Trigger>
              <Typography.Text appearance="primary">
                {e.getValue().toWalletType}
              </Typography.Text>
            </Tooltip.Trigger>
            <Tooltip.Content>
              {e.getValue().fromWalletType === "Funding Account" ? (
                <Typography.Text>
                  Balance available across all trading accounts.
                </Typography.Text>
              ) : (
                <div className="flex items-center gap-2">
                  <Typography.Text>
                    {e.getValue().fromWalletName}
                  </Typography.Text>
                  <Typography.Text appearance="primary">
                    {address}
                  </Typography.Text>
                </div>
              )}
            </Tooltip.Content>
          </Tooltip>
        </div>
      );
    },
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        From/To
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
  }),
  columnHelper.accessor((row) => row.time, {
    id: "date",
    cell: (e) => (
      <Typography.Text size="sm">{e.getValue().toString()}</Typography.Text>
    ),
    header: () => (
      <Typography.Text size="xs" appearance="primary">
        Date
      </Typography.Text>
    ),
    footer: (e) => e.column.id,
  }),
];
