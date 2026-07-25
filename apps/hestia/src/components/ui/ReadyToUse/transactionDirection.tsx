import { Tooltip, Typography } from "@mitra/ux";
import { RiArrowRightLine } from "@remixicon/react";
import React from "react";

export const TransactionDirection = ({
  tooltipable,
  fromType,
  fromName,
  fromAddress,
  toType,
  toAddress,
  toName,
}: {
  tooltipable?: boolean;
  fromType: string;
  fromName?: string;
  fromAddress?: string;
  toType: string;
  toAddress?: string;
  toName?: string;
}) => {
  return (
    <div className="flex items-center gap-2">
      {tooltipable ? (
        <Typography.Text>{fromType}</Typography.Text>
      ) : (
        <Tooltip>
          <Tooltip.Trigger className="flex items-center gap-1">
            <Typography.Text>{fromType}</Typography.Text>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <div className="flex items-center gap-2">
              {fromName && <Typography.Text>{fromName}</Typography.Text>}
              <Typography.Text appearance="primary">
                {fromAddress}
              </Typography.Text>
            </div>
          </Tooltip.Content>
        </Tooltip>
      )}
      <div className="flex items-center justify-center bg-level-1 w-5 h-5 rounded-md">
        <RiArrowRightLine className="w-3 h-3 text-primary" />
      </div>
      <Tooltip>
        <Tooltip.Trigger>
          <Typography.Text appearance="primary">{toType}</Typography.Text>
        </Tooltip.Trigger>
        <Tooltip.Content>
          {fromType === "Funding Account" && toType === "Trading Account" ? (
            <Typography.Text>
              Balance available across all trading accounts.
            </Typography.Text>
          ) : (
            <div className="flex items-center gap-2">
              {toName && <Typography.Text>{toName}</Typography.Text>}
              <Typography.Text appearance="primary">
                {toAddress}
              </Typography.Text>
            </div>
          )}
        </Tooltip.Content>
      </Tooltip>
    </div>
  );
};
