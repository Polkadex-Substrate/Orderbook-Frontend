"use client";

import classNames from "classnames";
import { useFormik } from "formik";
import { Button, Input, Spinner, Typography } from "@mitra/ux";
import { Market, Ticker } from "@orderbook/core/utils/orderbookService/types";
import { useMarketOrder } from "@orderbook/core/hooks";
import { marketOrderValidations } from "@orderbook/core/validations";

import { Balance } from "../balance";
import ConnectAccount from "../connectAccount";

import { Range } from "@/components/ui/Temp/range";
import { TradingFee } from "@/components/ui/ReadyToUse";
import { useFlashOnExternalChange } from "@/hooks/useFlashOnExternalChange";
import { useMoveAndTrade } from "@/hooks/useMoveAndTrade";

const AMOUNT = "amount";

const initialValues = {
  amount: "",
};

export const BuyOrder = ({
  market,
  ticker,
  availableQuoteAmount,
}: {
  market?: Market;
  ticker: Ticker;
  availableQuoteAmount: number;
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
      minVolume: market?.minVolume || 0,
      maxVolume: market?.maxVolume || 0,
      availableBalance: availableQuoteAmount,
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
    isSell: false,
    setValues,
    values,
    market,
  });

  // Highlight when the orderbook click fills the amount (external change).
  // Market buy spends the quote asset; `amount` is the quote total.
  const requiredQuote = Number(values.amount) || 0;
  const { canMoveAndTrade, moveAmount, phase, moveAndTrade } = useMoveAndTrade({
    assetId: market?.quoteAsset?.id,
    required: requiredQuote,
    available: availableQuoteAmount,
  });

  const amountFlash = useFlashOnExternalChange(values.amount);

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
          <Input.Ticker>{market?.quoteAsset?.ticker}</Input.Ticker>
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
        <TradingFee ticker={market?.baseAsset?.ticker || ""} />
        <Balance baseTicker={market?.quoteAsset?.ticker || ""}>
          {availableQuoteAmount}
        </Balance>
      </div>
      <div className="my-2">
        <Range
          ranges={[
            {
              value: "25%",
              action: () => onChangeRange(25, availableQuoteAmount),
            },
            {
              value: "50%",
              action: () => onChangeRange(50, availableQuoteAmount),
            },
            {
              value: "75%",
              action: () => onChangeRange(75, availableQuoteAmount),
            },
            {
              value: "100%",
              action: () => onChangeRange(100, availableQuoteAmount),
            },
          ]}
        />
      </div>
      {isSignedIn ? (
        dirty && requiredQuote > availableQuoteAmount && canMoveAndTrade ? (
          <Button.Solid
            appearance="success"
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
                Move {moveAmount.toFixed(4)} {market?.quoteAsset?.ticker} & Buy
              </>
            )}
          </Button.Solid>
        ) : (
          <Button.Solid
            type="submit"
            disabled={!(isValid && dirty) || isSubmitting}
            appearance="success"
          >
            {isSubmitting ? (
              <Spinner.Keyboard className="h-6 w-6" />
            ) : (
              <>Buy {market?.baseAsset?.ticker}</>
            )}
          </Button.Solid>
        )
      ) : (
        <ConnectAccount />
      )}
    </form>
  );
};
