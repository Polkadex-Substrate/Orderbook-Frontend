"use client";

import { ChangeEvent, useState } from "react";
import { Button, Input, Tooltip, Spinner } from "@polkadex/ux";
import classNames from "classnames";
import { useFormik } from "formik";
import { useLimitOrder } from "@orderbook/core/hooks";
import { limitOrderValidations } from "@orderbook/core/validations";
import { Market } from "@orderbook/core/utils/orderbookService/types";

import { Balance } from "../balance";
import ConnectAccount from "../connectAccount";

import { Range } from "@/components/ui/Temp/range";
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
  isResponsive = false,
}: {
  market?: Market;
  availableQuoteAmount: number;
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

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const name = e.target.name;
    const value = e.target.value;
    if (name === PRICE) onChangePrice(value);
    else if (name === AMOUNT) onChangeAmount(value);
    else onChangeTotal(value);
  };

  return (
    <form
      className="flex flex-auto flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!validateSubmit) setValidateSubmit(true);
        handleSubmit();
      }}
    >
      <Tooltip open={!!errors.price && !!touched.price && isSignedIn}>
        <Tooltip.Trigger asChild>
          <div
            className={classNames(
              "border",
              !!errors.price && isSignedIn
                ? "border-danger-base border"
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
        </Tooltip.Trigger>
        <Tooltip.Content
          side={isResponsive ? "top" : "left"}
          align={isResponsive ? "start" : "center"}
          sideOffset={isResponsive ? 6 : 12}
          alignOffset={isResponsive ? 50 : 0}
          className={classNames(
            "bg-level-5 z-[3] p-1",
            isResponsive && "text-sm z-[51]"
          )}
        >
          {errors.price}
        </Tooltip.Content>
      </Tooltip>

      <Tooltip open={!!errors.amount && !!touched.amount && isSignedIn}>
        <Tooltip.Trigger asChild>
          <div
            className={classNames(
              "border",
              !!errors.amount && isSignedIn
                ? "border-danger-base border"
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
      <Tooltip open={!!errors.total && !!touched.total && isSignedIn}>
        <Tooltip.Trigger asChild>
          <div
            className={classNames(
              "border",
              !!errors.total && isSignedIn
                ? "border-danger-base border"
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
          {errors.total}
        </Tooltip.Content>
      </Tooltip>

      {isSignedIn ? (
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
      ) : (
        <ConnectAccount />
      )}
    </form>
  );
};
