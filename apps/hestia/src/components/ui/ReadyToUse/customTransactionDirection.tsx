import { Tooltip, Typography } from "@mitrabook/ux";
import { RiArrowRightLine } from "@remixicon/react";

export const CustomTransactionDirection = ({
  showFromToolTip,
  fromType,
  fromName,
  fromAddress,

  toType,
  toAddress,
  toName,
}: {
  showFromToolTip: boolean;
  fromType: string;
  fromName: string;
  fromAddress: string;

  toType: string;
  toName: string;
  toAddress: string;
}) => {
  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <Tooltip.Trigger className="flex items-center gap-1">
          <Typography.Text>{fromType}</Typography.Text>
        </Tooltip.Trigger>
        <Tooltip.Content className={`${!showFromToolTip && "opacity-0"}`}>
          <div className="flex items-center gap-2">
            <Typography.Text>{fromName}</Typography.Text>
            <Typography.Text appearance="primary">
              {fromAddress}
            </Typography.Text>
          </div>
        </Tooltip.Content>
      </Tooltip>
      <div className="flex items-center justify-center bg-level-1 w-5 h-5 rounded-md">
        <RiArrowRightLine className="w-4 h-4 text-primary" />
      </div>
      <Tooltip>
        <Tooltip.Trigger className="flex items-center gap-1">
          <Typography.Text>{toType}</Typography.Text>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <div className="flex items-center gap-2">
            {toType === "Trading Account" ? (
              <Typography.Text>
                Balance available across all trading accounts.
              </Typography.Text>
            ) : (
              <>
                <Typography.Text>{toName}</Typography.Text>
                <Typography.Text appearance="primary">
                  {toAddress}
                </Typography.Text>
              </>
            )}
          </div>
        </Tooltip.Content>
      </Tooltip>
    </div>
  );
};
