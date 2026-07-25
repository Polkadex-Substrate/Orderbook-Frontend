import { Skeleton, Typography } from "@mitrabook/ux";
import { RiArrowDownLine, RiArrowUpLine } from "@remixicon/react";
import classNames from "classnames";
import { useProfile } from "@orderbook/core/providers/user/profile";

export const LastPrice = ({
  lastPrice,
  isPriceUp,
  loading,
  inverted,
}: {
  lastPrice: number;
  isPriceUp: boolean;
  loading: boolean;
  inverted: boolean;
}) => {
  const { onSetPrice } = useProfile();

  return (
    <div
      role="button"
      className={classNames(
        inverted && "order-1",
        "flex items-center justify-between gap-2 p-2 border-y border-primary cursor-pointer"
      )}
      onClick={() => onSetPrice(lastPrice.toString())}
    >
      <Skeleton loading={loading} className="h-4 max-w-20">
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1 text-sm font-semibold leading-none">
            <Typography.Text
              size="lg"
              appearance={!isPriceUp ? "danger" : "success"}
            >
              {lastPrice}
            </Typography.Text>
            {isPriceUp ? (
              <RiArrowUpLine className="w-4 h-4 text-success-base" />
            ) : (
              <RiArrowDownLine className="w-4 h-4 text-danger-base" />
            )}
          </div>
        </div>
      </Skeleton>
      <Typography.Text
        size="xs"
        appearance="primary"
        className="whitespace-nowrap"
      >
        Last price
      </Typography.Text>
    </div>
  );
};
