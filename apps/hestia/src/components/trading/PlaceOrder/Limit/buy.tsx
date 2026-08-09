"use client";

import { ChangeEvent, useState } from "react";
import { Button, Input, Spinner, Typography } from "@mitrabook/ux";
import classNames from "classnames";
import { useFormik } from "formik";
import { useLimitOrder } from "@orderbook/core/hooks";
import { limitOrderValidations } from "@orderbook/core/validations";
import { Market } from "@orderbook/core/utils/orderbookService/types";
import { formatDisplay } from "@orderbook/format";

import { Balance } from "../balance";
import ConnectAccount from "../connectAccount";
import { OrderAction } from "../orderAction";

import { Range } from "@/components/ui/Temp/range";
import { useFlashOnFill } from "@/components/trading/orderbookFill";
import { useMoveAndTrade } from "@/hooks/useMoveAndTrade";
import { TradingFee } from "@/components/ui/ReadyToUse";

const PRICE = "price";
const AMOUNT = "amount";
const TOTAL = "total";

const initialValues = {
  price: "",
  amount: "",
  total: "",
};

export const BuyOrder = ({
  market,
  availableQuoteAmount,
}: {
  market?: Market;
  availableQuoteAmount: number;
  /** Legacy prop (was tooltip placement); accepted but unused. */
  isResponsive?: boolean;
}) => {
  const [validateSubmit, setValidateSubmit] = useState(false);

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
    validationSchema: limitOrderValidations({
      minMarketPrice: market?.minPrice || 0,
      minQuantity: market?.minQty || 0,
      minVolume: market?.minVolume || 0,
      maxVolume: market?.maxVolume || 0,
      availableBalance: availableQuoteAmount,
      qtyStepSize: market?.qty_step_size || 0,
    }),
    validateOnChange: validateSubmit,
    validateOnBlur: true,
    onSubmit: async (e) => {
      try {
        await onExecuteOrder(e.price, e.amount);
        resetForm();
      } catch (error) {
        // TODO: Handle error with toast
        console.log(error);
      }
    },
  });

  const {
    isSignedIn,
    onChangePrice,
    onChangeTotal,
    onChangeAmount,
    onExecuteOrder,
    onChangeRange,
    onIncreasePrice,
    onDecreasePrice,
    onIncreaseAmount,
    onDecreaseAmount,
    onIncreaseTotal,
    onDecreaseTotal,
  } = useLimitOrder({
    isSell: false,
    market,
    values,
    setValues,
  });

  // "Move & trade": order needs quote asset; offer to pull the shortfall
  // from the funding account and place the order once it's credited.
  const requiredQuote = Number(values.total) || 0;
  const { canMoveAndTrade, moveAmount, phase, moveAndTrade } = useMoveAndTrade({
    assetId: market?.quoteAsset?.id,
    required: requiredQuote,
    available: availableQuoteAmount,
  });

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const name = e.target.name;
    const value = e.target.value;
    if (name === PRICE) onChangePrice(value);
    else if (name === AMOUNT) onChangeAmount(value);
    else onChangeTotal(value);
  };

  // Highlight fields when the orderbook click fills them (external change).
  const priceFlash = useFlashOnFill("price");
  const amountFlash = useFlashOnFill("amount");
  const totalFlash = useFlashOnFill("total");

  return (
    <form
      className="flex flex-auto flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!validateSubmit) setValidateSubmit(true);
        handleSubmit();
      }}
    >
      <div
        className={classNames(
          "border transition-colors duration-300",
          !!errors.price && isSignedIn
            ? "border-danger-base"
            : priceFlash
              ? "border-attention-base bg-attention-base/10"
              : "border-transparent"
        )}
      >
        <Input.Primary
          name={PRICE}
          type="text"
          placeholder="0.0000000000"
          autoComplete="off"
          value={values.price}
          onChange={onChange}
          onFocus={(e) => {
            if (!validateSubmit) setValidateSubmit(true);
            handleBlur(e);
          }}
          onBlur={() => setFieldTouched(PRICE, false)}
          className="max-sm:focus:text-[16px]"
        >
          <Input.Label className="w-[50px]">Price</Input.Label>
          <Input.Ticker>{market?.quoteAsset?.ticker}</Input.Ticker>
          <Input.Button variant="increase" onClick={onIncreasePrice} />
          <Input.Button variant="decrease" onClick={onDecreasePrice} />
        </Input.Primary>
      </div>
      {/*
        The message condition used to also require `touched.price`, while the
        BORDER above required only `errors.price`. Those two conditions must
        match or the field goes red and says nothing - which is exactly what was
        reported ("the total box turned red without message what is going on").

        Worse, `onBlur={() => setFieldTouched(FIELD, false)}` CLEARS touched on
        blur, so it was rarely true; and Total is usually computed from Amount
        rather than typed, so it was never touched at all. The gate could not
        have worked.
      */}
      {!!errors.price && isSignedIn && (
        <Typography.Text size="xs" className="text-danger-base px-1">
          {errors.price}
        </Typography.Text>
      )}

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
          name={AMOUNT}
          placeholder="0.0000000000"
          autoComplete="off"
          value={values.amount}
          onChange={onChange}
          onFocus={(e) => {
            if (!validateSubmit) setValidateSubmit(true);
            handleBlur(e);
          }}
          onBlur={() => setFieldTouched(AMOUNT, false)}
          className="max-sm:focus:text-[16px]"
        >
          <Input.Label className="w-[50px]">Amount</Input.Label>
          <Input.Ticker>{market?.baseAsset?.ticker}</Input.Ticker>
          <Input.Button variant="increase" onClick={onIncreaseAmount} />
          <Input.Button variant="decrease" onClick={onDecreaseAmount} />
        </Input.Primary>
      </div>
      {!!errors.amount && isSignedIn && (
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
      <div
        className={classNames(
          "border transition-colors duration-300",
          !!errors.total && isSignedIn
            ? "border-danger-base"
            : totalFlash
              ? "border-attention-base bg-attention-base/10"
              : "border-transparent"
        )}
      >
        <Input.Primary
          type="text"
          name={TOTAL}
          placeholder="0.0000000000"
          autoComplete="off"
          value={values.total}
          onChange={onChange}
          onFocus={(e) => {
            if (!validateSubmit) setValidateSubmit(true);
            handleBlur(e);
          }}
          onBlur={() => setFieldTouched(TOTAL, false)}
          className="max-sm:focus:text-[16px]"
        >
          <Input.Label className="w-[50px]">Total</Input.Label>
          <Input.Ticker>{market?.quoteAsset?.ticker}</Input.Ticker>
          <Input.Button variant="increase" onClick={onIncreaseTotal} />
          <Input.Button variant="decrease" onClick={onDecreaseTotal} />
        </Input.Primary>
      </div>
      {!!errors.total && isSignedIn && (
        <Typography.Text size="xs" className="text-danger-base px-1">
          {errors.total}
        </Typography.Text>
      )}

      <OrderAction>
        {isSignedIn ? (
          dirty && requiredQuote > availableQuoteAmount && canMoveAndTrade ? (
            <Button.Solid
              appearance="success"
              type="button"
              disabled={phase !== "idle" || isSubmitting}
              onClick={() =>
                moveAndTrade(async () => {
                  await onExecuteOrder(values.price, values.amount);
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
                  Move {formatDisplay(moveAmount)} {market?.quoteAsset?.ticker}{" "}
                  & Buy
                </>
              )}
            </Button.Solid>
          ) : (
            <Button.Solid
              appearance="success"
              type="submit"
              disabled={!(isValid && dirty) || isSubmitting}
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
      </OrderAction>
    </form>
  );
};
