"use client";

import classNames from "classnames";
import { useFormik } from "formik";
import { Button, Input, Spinner, Typography } from "@mitrabook/ux";
import { Market, Ticker } from "@orderbook/core/utils/orderbookService/types";
import { useMarketOrder } from "@orderbook/core/hooks";
import { marketOrderValidations } from "@orderbook/core/validations";
import { formatDisplay } from "@orderbook/format";

import { Balance } from "../balance";
import ConnectAccount from "../connectAccount";
import { OrderAction } from "../orderAction";

import { Range } from "@/components/ui/Temp/range";
import { TradingFee } from "@/components/ui/ReadyToUse";
import { useFlashOnFill } from "@/components/trading/orderbookFill";
import { useMoveAndTrade } from "@/hooks/useMoveAndTrade";

const AMOUNT = "amount";

const initialValues = {
  amount: "",
};

export const SellOrder = ({
  market,
  ticker,
  availableBaseAmount,
}: {
  market?: Market;
  ticker: Ticker;
  availableBaseAmount: number;
  /** Legacy prop (was tooltip placement); accepted but unused. */
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

  // Highlight when the orderbook click fills the amount (external change).
  // Market sell spends the base asset; `amount` is the base quantity.
  const requiredBase = Number(values.amount) || 0;
  const { canMoveAndTrade, moveAmount, phase, moveAndTrade } = useMoveAndTrade({
    assetId: market?.baseAsset?.id,
    required: requiredBase,
    available: availableBaseAmount,
  });

  const amountFlash = useFlashOnFill("amount");

  return (
    <form className="flex flex-auto flex-col gap-2" onSubmit={handleSubmit}>
      <Button.Solid
        appearance="secondary"
        className="pointer-events-none opacity-50 border border-dashed py-5"
        size="md"
      >
        Best Market Price
      </Button.Solid>

      <div
        className={classNames(
          "border transition-colors duration-300",
          !!errors.amount && isSignedIn
            ? "border-danger-base"
            : amountFlash
              ? "border-attention-base bg-attention-base/10"
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
      {!!errors.amount && !!touched.amount && isSignedIn && (
        <Typography.Text size="xs" className="text-danger-base px-1">
          {errors.amount}
        </Typography.Text>
      )}
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
      <OrderAction>
        {isSignedIn ? (
          dirty && requiredBase > availableBaseAmount && canMoveAndTrade ? (
            <Button.Solid
              appearance="danger"
              type="button"
              disabled={phase !== "idle" || isSubmitting}
              onClick={() =>
                moveAndTrade(async () => {
                  await onExecuteOrder(values.amount);
                  resetForm();
                })
              }
            >
              {phase === "depositing" ? (
                <Spinner.Keyboard className="h-6 w-6" />
              ) : phase === "crediting" ? (
                <>Crediting balance...</>
              ) : (
                <>
                  Move {formatDisplay(moveAmount)} {market?.baseAsset?.ticker} &
                  Sell
                </>
              )}
            </Button.Solid>
          ) : (
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
          )
        ) : (
          <ConnectAccount side="sell" ticker={market?.baseAsset?.ticker} />
        )}
      </OrderAction>
    </form>
  );
};
