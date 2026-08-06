import { useCallback, useEffect, useMemo, useState } from "react";
import BigNumber from "bignumber.js";
import { FormikHelpers } from "formik";
import { useProfile } from "@orderbook/core/providers/user/profile";
import { Decimal } from "@orderbook/core/utils";
import {
  cleanPositiveFloatInput,
  decimalPlaces,
  formatNumber,
  getAbsoluteNumber,
  precisionRegExp,
  trimFloat,
} from "@orderbook/core/helpers";
import { useCreateOrder, useTickers } from "@orderbook/core/hooks";
import { Market } from "@orderbook/core/utils/orderbookService/types";

type FormValues = {
  price: string;
  amount: string;
  total: string;
};

type Props = {
  isSell: boolean;
  market?: Market;
  values: FormValues;
  setValues: FormikHelpers<FormValues>["setValues"];
};

export const useLimitOrder = ({ isSell, market, values, setValues }: Props) => {
  const [mount, setMount] = useState(false);

  const { pricePrecision, qtyPrecision, totalPrecision } = useMemo(() => {
    const pricePrecision = decimalPlaces(market?.price_tick_size || 0);
    const qtyPrecision = decimalPlaces(market?.qty_step_size || 0);
    const totalPrecision = Math.max(pricePrecision, qtyPrecision);
    return { pricePrecision, qtyPrecision, totalPrecision };
  }, [market?.price_tick_size, market?.qty_step_size]);

  const minAmount = market?.minQty || 0;
  const minPrice = market?.minPrice || 0;
  const amountTickSize = market?.qty_step_size || 0;
  const priceTickSize = market?.price_tick_size || 0;
  const minTotal = 1;
  const totalTickSize = 0.5;

  const {
    currentTicker: { currentPrice: lastPriceValue },
  } = useTickers(market?.id);

  const {
    selectedAddresses: { tradeAddress },
    price: roughPrice,
    amount: roughAmount,
    total: roughTotal,
  } = useProfile();

  const { currentPrice, currentAmount, currentTotal } = useMemo(() => {
    const currentPrice = Decimal.format(roughPrice, pricePrecision);
    const currentAmount = Decimal.format(roughAmount, qtyPrecision);
    const currentTotal = Decimal.format(roughTotal, totalPrecision);
    return { currentPrice, currentAmount, currentTotal };
  }, [
    pricePrecision,
    qtyPrecision,
    roughAmount,
    roughPrice,
    roughTotal,
    totalPrecision,
  ]);

  const { mutateAsync: onPlaceOrders } = useCreateOrder();

  // Get estimated total amount
  const getEstimatedTotal = useCallback(
    (total: number | string): string =>
      Decimal.format(
        total,
        market?.basePrecision || market?.quotePrecision || 0,
        ","
      ),
    [market?.basePrecision, market?.quotePrecision]
  );

  const calculateTotal = useCallback((price: string, amount: string) => {
    const bigPrice = new BigNumber(price);
    const bigAmount = new BigNumber(amount);
    return bigPrice.multipliedBy(bigAmount).toFixed();
  }, []);

  const onChangePrice = useCallback(
    (price: string) => {
      const amount = values.amount;
      const convertedValue = cleanPositiveFloatInput(price?.toString());
      if (convertedValue?.match(precisionRegExp(pricePrecision || 0))) {
        const total =
          amount && convertedValue
            ? calculateTotal(convertedValue, amount)
            : "";

        setValues({
          amount,
          price: convertedValue,
          total: total && formatNumber(Decimal.format(total, totalPrecision)),
        });
      }
    },

    [pricePrecision, calculateTotal, setValues, values.amount, totalPrecision]
  );

  const onChangeAmount = useCallback(
    (amount: string) => {
      const price = values.price;
      const convertedValue = cleanPositiveFloatInput(amount);
      if (convertedValue.match(precisionRegExp(qtyPrecision || 0))) {
        const total =
          convertedValue && price ? calculateTotal(price, convertedValue) : "";

        setValues({
          price,
          amount: convertedValue,
          total: total && formatNumber(Decimal.format(total, totalPrecision)),
        });
      }
    },
    [qtyPrecision, calculateTotal, setValues, values.price, totalPrecision]
  );

  const onChangeTotal = useCallback(
    (total: string) => {
      const price = values.price;
      const convertedValue = cleanPositiveFloatInput(total);
      if (convertedValue.match(precisionRegExp(totalPrecision || 0))) {
        const formPrice = +price || lastPriceValue;

        const estimatedAmount =
          formPrice === 0
            ? ""
            : trimFloat({
                value: Number(total) / formPrice,
                digitsAfterDecimal: qtyPrecision,
              });

        setValues({
          total,
          price: formPrice === 0 ? "" : String(formPrice),
          amount: estimatedAmount === "0" ? "" : estimatedAmount,
        });
      }
    },
    [lastPriceValue, qtyPrecision, setValues, totalPrecision, values.price]
  );

  const onChangeRange = (
    percent: number,
    availableBalance: number,
    isSell?: boolean
  ) => {
    const price = values.price || String(lastPriceValue);
    if (!price || price === "0") return;
    if (isSell) {
      const amount = `${availableBalance * percent * 0.01}`;
      const total = getAbsoluteNumber(
        getEstimatedTotal(calculateTotal(price, amount))
      );
      setValues({
        ...values,
        price,
        amount: Decimal.format(amount, qtyPrecision),
        total: formatNumber(Decimal.format(total, totalPrecision)),
      });
      return;
    }

    const total = getAbsoluteNumber(
      getEstimatedTotal(availableBalance * percent * 0.01)
    );
    const amount = trimFloat({
      value: total / +price,
      digitsAfterDecimal: qtyPrecision,
    });

    setValues({
      ...values,
      price,
      amount: Decimal.format(amount, qtyPrecision),
      total: formatNumber(Decimal.format(total, totalPrecision)),
    });
  };

  const onIncreasePrice = () => {
    let price = values.price;
    if (!price.trim().length) price = String(minPrice);
    else price = String(+values.price + priceTickSize);
    onChangePrice(parseFloat(price).toFixed(pricePrecision));
  };

  const onDecreasePrice = () => {
    let price = values.price;
    if (!price.trim().length || +price <= minPrice) return;
    price = String(+values.price - priceTickSize);
    onChangePrice(parseFloat(price).toFixed(pricePrecision));
  };

  const onIncreaseAmount = () => {
    let amount = values.amount;
    if (!amount.trim().length) amount = String(minAmount);
    else amount = String(+values.amount + amountTickSize);
    onChangeAmount(parseFloat(amount).toFixed(qtyPrecision));
  };

  const onDecreaseAmount = () => {
    let amount = values.amount;
    if (!amount.trim().length || +values.amount <= minAmount) return;
    amount = String(+values.amount - amountTickSize);
    onChangeAmount(parseFloat(amount).toFixed(qtyPrecision));
  };

  const onIncreaseTotal = () => {
    let total = values.total;
    if (!total.trim().length) total = String(minTotal);
    else total = String(+values.total + totalTickSize);
    onChangeTotal(formatNumber(parseFloat(total).toFixed(totalPrecision)));
  };

  const onDecreaseTotal = () => {
    let total = values.total;
    if (!total.trim().length || +values.total <= minTotal) return;
    total = String(+values.total - totalTickSize);
    onChangeTotal(formatNumber(parseFloat(total).toFixed(totalPrecision)));
  };

  // Calls the action for placing order
  const onExecuteOrder = async (price: string, amount: string) => {
    if (!market) {
      console.error("No market selected");
      return;
    }
    await onPlaceOrders({
      orderType: "LIMIT",
      symbol: [market?.baseAsset?.id, market?.quoteAsset?.id],
      side: isSell ? "Ask" : "Bid",
      price,
      amount: Number(amount),
      market,
    });
  };

  useEffect(() => {
    if (+currentPrice) onChangePrice(currentPrice);
  }, [currentPrice, onChangePrice]);

  useEffect(() => {
    if (+currentAmount) onChangeAmount(currentAmount);
  }, [onChangeAmount, currentAmount]);

  useEffect(() => {
    if (+currentTotal) onChangeTotal(currentTotal);
  }, [onChangeTotal, currentTotal]);

  useEffect(() => {
    if (!mount && !!lastPriceValue) {
      onChangePrice(lastPriceValue.toString());
      setMount(true);
    }
  }, [lastPriceValue, onChangePrice, mount]);

  return {
    isSignedIn: tradeAddress?.length > 0,

    onChangeAmount,
    onChangePrice,
    onChangeTotal,

    onIncreasePrice,
    onDecreasePrice,
    onIncreaseAmount,
    onDecreaseAmount,
    onIncreaseTotal,
    onDecreaseTotal,

    onChangeRange,
    onExecuteOrder,
  };
};
