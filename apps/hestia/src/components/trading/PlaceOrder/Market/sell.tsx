"use client";

import classNames from "classnames";
import { useFormik } from "formik";
import { Button, Input, Spinner, Tooltip } from "@polkadex/ux";
import { Market, Ticker } from "@orderbook/core/utils/orderbookService/types";
import { useMarketOrder } from "@orderbook/core/hooks";
import { marketOrderValidations } from "@orderbook/core/validations";

import { Balance } from "../balance";
import ConnectAccount from "../connectAccount";

import { Range } from "@/components/ui/Temp/range";
import { TradingFee } from "@/components/ui/ReadyToUse";

const AMOUNT = "amount";

const initialValues = {
  amount: "",
};

export const SellOrder = ({
  market,
  ticker,
  availableBaseAmount,
  isResponsive = false,
}: {
  market?: Market;
  ticker: Ticker;
  availableBaseAmount: number;
  isResponsive?: boolean;
}) => {
  const {
    handleSubmit,
    errors,
    isValid,
    dirty,
    values,
    setValues,
    resetForm,
    isSubmitting,
    touched,
    handleBlur,
    setFieldTouched,
  } = useFormik({
    initialValues,
    validationSchema: marketOrderValidations({
      isSell: true,
      minVolume: market?.minVolume || 0,
      maxVolume: market?.maxVolume || 0,
      availableBalance: availableBaseAmount,
      qtyStepSize: market?.qty_step_size || 0,
      currentMarketPrice: ticker.currentPrice,
    }),
    validateOnBlur: true,
    onSubmit: async (e) => {
      try {
        await onExecuteOrder(e.amount);
        resetForm();
      } catch (error) {
        // TODO: Handle this with toast
        console.log(error);
      }
    },
  });
  const {
    onChangeAmount,
    onIncreaseAmount,
    onDecreaseAmount,
    onChangeRange,
    onExecuteOrder,
    isSignedIn,
  } = useMarketOrder({
    isSell: true,
    setValues,
    values,
    market,
  });

  return (
    <form className="flex flex-auto flex-col gap-2" onSubmit={handleSubmit}>
      <Button.Solid
        appearance="secondary"
        className="pointer-events-none opacity-50 border border-dashed py-5"
        size="md"
      >
        Best Market Price
      </Button.Solid>

      <Tooltip open={!!errors.amount && !!touched.amount && isSignedIn}>
        <Tooltip.Trigger asChild>
          <div
            className={classNames(
              "border",
              !!errors.amount && isSignedIn
                ? "border-danger-base"
                : "border-transparent"
            )}
          >
            <Input.Primary
              type="text"
              placeholder="0.0000000000"
              autoComplete="off"
              name={AMOUNT}
              value={values.amount}
              onChange={(e) => onChangeAmount(e.target.value)}
              onFocus={handleBlur}
              onBlur={() => setFieldTouched(AMOUNT, false)}
              className="max-sm:focus:text-[16px]"
            >
              <Input.Label className="w-[50px]">Amount</Input.Label>
              <Input.Ticker>{market?.baseAsset?.ticker}</Input.Ticker>
              <Input.Button variant="increase" onClick={onIncreaseAmount} />
              <Input.Button variant="decrease" onClick={onDecreaseAmount} />
            </Input.Primary>
          </div>
        </Tooltip.Trigger>
        <Tooltip.Content
          side={isResponsive ? "top" : "left"}
          align={isResponsive ? "start" : "center"}
          sideOffset={isResponsive ? 6 : 12}
          alignOffset={isResponsive ? 50 : 0}
          className={classNames(
            "bg-level-5 z-[2] p-1",
            isResponsive && "text-sm z-[51]"
          )}
        >
          {errors.amount}
        </Tooltip.Content>
      </Tooltip>
      <div className="flex items-center gap-2 justify-between">
        <TradingFee ticker={market?.quoteAsset?.ticker || ""} />
        <Balance baseTicker={market?.baseAsset?.ticker || ""}>
          {availableBaseAmount}
        </Balance>
      </div>
      <div className="my-2">
        <Range
          ranges={[
            {
              value: "25%",
              action: () => onChangeRange(25, availableBaseAmount),
            },
            {
              value: "50%",
              action: () => onChangeRange(50, availableBaseAmount),
            },
            {
              value: "75%",
              action: () => onChangeRange(75, availableBaseAmount),
            },
            {
              value: "100%",
              action: () => onChangeRange(100, availableBaseAmount),
            },
          ]}
        />
      </div>
      {isSignedIn ? (
        <Button.Solid
          type="submit"
          appearance="danger"
          disabled={!(isValid && dirty) || isSubmitting}
        >
          {isSubmitting ? (
            <Spinner.Keyboard className="h-6 w-6" />
          ) : (
            <>Sell {market?.baseAsset?.ticker}</>
          )}
        </Button.Solid>
      ) : (
        <ConnectAccount />
      )}
    </form>
  );
};
