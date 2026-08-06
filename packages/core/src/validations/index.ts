import * as Yup from "yup";
import {
  formatAmount,
  getDigitsAfterDecimal,
  parseScientific,
} from "@orderbook/core/helpers";
import {
  CrossChainError,
  ESTIMATED_FEE,
  ErrorMessages,
  MAX_DIGITS_AFTER_DECIMAL,
} from "@orderbook/core/constants";

export const bridgeValidations = (
  sourceWalletPresent: boolean,
  destinationWalletPresent: boolean,
  minAmount = 0,
  maxAmount = 0,
  destinationPDEXBalance = 0,
  balance = 0,
  isDestinationPolkadex: boolean,
  poolReserve: number
) => {
  const min = formatAmount(minAmount);

  return Yup.object().shape({
    amount: Yup.string()
      .required("Required")
      .test(
        CrossChainError.SOURCE_WALLET,
        CrossChainError.SOURCE_WALLET,
        () => sourceWalletPresent
      )
      .test(
        CrossChainError.DESTINATION_WALLET,
        CrossChainError.DESTINATION_WALLET,
        () => destinationWalletPresent
      )
      .test(
        ErrorMessages().WHITESPACE_NOT_ALLOWED,
        ErrorMessages().WHITESPACE_NOT_ALLOWED,
        (value) => !/\s/.test(value || "")
      )
      .test(
        ErrorMessages().MUST_BE_A_NUMBER,
        ErrorMessages().MUST_BE_A_NUMBER,
        (value) => /^\d+(\.\d+)?$/.test(value || "")
      )
      .test(
        ErrorMessages().ZERO,
        ErrorMessages().ZERO,
        (value) => Number(value) > 0
      )
      .test(
        ErrorMessages("0", min).MIN,
        ErrorMessages("0", min).MIN,
        (value) => Number(value) >= minAmount
      )
      .test(
        ErrorMessages().CHECK_BALANCE,
        ErrorMessages().CHECK_BALANCE,
        (value) => Number(value) <= Number(balance)
      )
      .test(
        ErrorMessages().EXISTENTIAL_DEPOSIT,
        ErrorMessages().EXISTENTIAL_DEPOSIT,
        (value) => Number(value) <= Number(maxAmount)
      )
      .test(
        ErrorMessages().CHECK_VALID_AMOUNT,
        ErrorMessages().CHECK_VALID_AMOUNT,
        (value) =>
          !(value?.toString().includes("e") || value?.toString().includes("o"))
      )
      .test(
        ErrorMessages().MAX_DIGIT_AFTER_DECIMAL,
        ErrorMessages().MAX_DIGIT_AFTER_DECIMAL,
        (value) =>
          value
            ? getDigitsAfterDecimal(value) <= MAX_DIGITS_AFTER_DECIMAL
            : false
      )
      .test(
        CrossChainError.NOT_ENOUGH_LIQUIDITY,
        CrossChainError.NOT_ENOUGH_LIQUIDITY,
        () =>
          isDestinationPolkadex && destinationPDEXBalance <= 1
            ? poolReserve !== 0
            : true
      ),
  });
};

export const directDepositValidations = (
  sourceWalletPresent: boolean,
  destinationWalletPresent: boolean,
  minAmount = 0,
  maxAmount = 0,
  destinationPDEXBalance = 0,
  balance = 0,
  poolReserve: number
) => {
  const min = formatAmount(minAmount);

  return Yup.object().shape({
    amount: Yup.string()
      .required("Required")
      .test(
        CrossChainError.SOURCE_WALLET,
        CrossChainError.SOURCE_WALLET,
        () => sourceWalletPresent
      )
      .test(
        ErrorMessages().CONNECT_WALLET,
        ErrorMessages().CONNECT_WALLET,
        () => destinationWalletPresent
      )
      .test(
        ErrorMessages().WHITESPACE_NOT_ALLOWED,
        ErrorMessages().WHITESPACE_NOT_ALLOWED,
        (value) => !/\s/.test(value || "")
      )
      .test(
        ErrorMessages().MUST_BE_A_NUMBER,
        ErrorMessages().MUST_BE_A_NUMBER,
        (value) => /^\d+(\.\d+)?$/.test(value || "")
      )
      .test(
        ErrorMessages().ZERO,
        ErrorMessages().ZERO,
        (value) => Number(value) > 0
      )
      .test(
        ErrorMessages("0", min).MIN,
        ErrorMessages("0", min).MIN,
        (value) => Number(value) >= minAmount
      )
      .test(
        ErrorMessages().CHECK_BALANCE,
        ErrorMessages().CHECK_BALANCE,
        (value) => Number(value) <= Number(balance)
      )
      .test(
        ErrorMessages().EXISTENTIAL_DEPOSIT,
        ErrorMessages().EXISTENTIAL_DEPOSIT,
        (value) => Number(value) <= Number(maxAmount)
      )
      .test(
        ErrorMessages().CHECK_VALID_AMOUNT,
        ErrorMessages().CHECK_VALID_AMOUNT,
        (value) =>
          !(value?.toString().includes("e") || value?.toString().includes("o"))
      )
      .test(
        ErrorMessages().MAX_DIGIT_AFTER_DECIMAL,
        ErrorMessages().MAX_DIGIT_AFTER_DECIMAL,
        (value) =>
          value
            ? getDigitsAfterDecimal(value) <= MAX_DIGITS_AFTER_DECIMAL
            : false
      )
      .test(
        CrossChainError.NOT_ENOUGH_LIQUIDITY,
        CrossChainError.NOT_ENOUGH_LIQUIDITY,
        () => (destinationPDEXBalance <= 1 ? poolReserve !== 0 : true)
      ),
  });
};

export const depositValidations = (
  chainBalance: number,
  isPolkadexToken: boolean,
  existentialBalance: number
) => {
  const parseScientificValue = parseScientific(existentialBalance.toString());
  return Yup.object().shape({
    amount: Yup.string()
      .required("Required")
      .test(
        ErrorMessages().WHITESPACE_NOT_ALLOWED,
        ErrorMessages().WHITESPACE_NOT_ALLOWED,
        (value) => !/\s/.test(value || "")
      )
      .test(
        ErrorMessages().MUST_BE_A_NUMBER,
        ErrorMessages().MUST_BE_A_NUMBER,
        (value) => /^\d+(\.\d+)?$/.test(value || "")
      )
      .test(
        ErrorMessages().TOO_SMALL,
        ErrorMessages().TOO_SMALL,
        (value) => Number(value) >= 0.00001
      )
      .test(
        ErrorMessages().CHECK_BALANCE,
        ErrorMessages().CHECK_BALANCE,
        (value) => Number(value) <= Number(chainBalance)
      )
      .test(
        ErrorMessages().CHECK_VALID_AMOUNT,
        ErrorMessages().CHECK_VALID_AMOUNT,
        (value) =>
          !(value?.toString().includes("e") || value?.toString().includes("o"))
      )
      .test(
        ErrorMessages().MAX_DIGIT_AFTER_DECIMAL,
        ErrorMessages().MAX_DIGIT_AFTER_DECIMAL,
        (value) =>
          value
            ? getDigitsAfterDecimal(value) <= MAX_DIGITS_AFTER_DECIMAL
            : false
      )
      .test(
        ErrorMessages().REMAINING_BALANCE,
        ErrorMessages().REMAINING_BALANCE,
        (value) => {
          const balanceAfterDeposit =
            chainBalance - Number(value) - ESTIMATED_FEE;
          return !(isPolkadexToken && balanceAfterDeposit < 1);
        }
      )
      .test(
        ErrorMessages(parseScientificValue).REMAINING_BALANCE_IF_NOT_PDEX,
        ErrorMessages(parseScientificValue).REMAINING_BALANCE_IF_NOT_PDEX,
        (value) => {
          const balance = Number(chainBalance);
          const valueNum = Number(value);
          const balanceAfterDeposit = parseFloat(
            (balance - valueNum).toFixed(12)
          );
          const isValid = balanceAfterDeposit < existentialBalance;
          return !(!isPolkadexToken && valueNum && isValid);
        }
      ),
  });
};

export const directWithdrawValidations = (
  sourceWalletPresent: boolean,
  destinationWalletPresent: boolean,
  isDestinationPolkadex: boolean,
  selectedAsset: string,
  minAmount = 0,
  balance = 0,
  swapPrice = 0
) => {
  const min = formatAmount(minAmount);

  return Yup.object().shape({
    amount: Yup.string()
      .required("Required")
      .test(
        ErrorMessages().CONNECT_WALLET,
        ErrorMessages().CONNECT_WALLET,
        () => sourceWalletPresent
      )
      .test(
        CrossChainError.DESTINATION_WALLET,
        CrossChainError.DESTINATION_WALLET,
        () => destinationWalletPresent
      )
      .test(
        ErrorMessages().WHITESPACE_NOT_ALLOWED,
        ErrorMessages().WHITESPACE_NOT_ALLOWED,
        (value) => !/\s/.test(value || "")
      )
      .test(
        ErrorMessages().MUST_BE_A_NUMBER,
        ErrorMessages().MUST_BE_A_NUMBER,
        (value) => /^\d+(\.\d+)?$/.test(value || "")
      )
      .test(
        ErrorMessages().ZERO,
        ErrorMessages().ZERO,
        (value) => Number(value) > 0
      )
      .test(
        ErrorMessages().TOO_SMALL,
        ErrorMessages().TOO_SMALL,
        (value) => Number(value) >= 0.000001
      )
      .test(
        ErrorMessages("0", min).MIN,
        ErrorMessages("0", min).MIN,
        (value) => Number(value) >= minAmount
      )
      .test(
        ErrorMessages().CHECK_BALANCE,
        ErrorMessages().CHECK_BALANCE,
        (value) => Number(value) <= Number(balance)
      )
      .test(
        ErrorMessages().CHECK_VALID_AMOUNT,
        ErrorMessages().CHECK_VALID_AMOUNT,
        (value) =>
          !(value?.toString().includes("e") || value?.toString().includes("o"))
      )
      .test(
        ErrorMessages().MAX_DIGIT_AFTER_DECIMAL,
        ErrorMessages().MAX_DIGIT_AFTER_DECIMAL,
        (value) =>
          value
            ? getDigitsAfterDecimal(value) <= MAX_DIGITS_AFTER_DECIMAL
            : false
      )
      .test(
        CrossChainError.NOT_ENOUGH_LIQUIDITY_WITHDRAW(selectedAsset),
        CrossChainError.NOT_ENOUGH_LIQUIDITY_WITHDRAW(selectedAsset),
        () =>
          isDestinationPolkadex || selectedAsset === "PDEX"
            ? true
            : swapPrice > 0
      ),
  });
};

export const withdrawValidations = (balance: string | number) => {
  return Yup.object().shape({
    amount: Yup.string()
      .required("Required")
      .test(
        ErrorMessages().WHITESPACE_NOT_ALLOWED,
        ErrorMessages().WHITESPACE_NOT_ALLOWED,
        (value) => (value ? !/\s/.test(value) : false)
      )
      .test(
        ErrorMessages().MUST_BE_A_NUMBER,
        ErrorMessages().MUST_BE_A_NUMBER,
        (value) => (value ? /^\d+(\.\d+)?$/.test(value) : false)
      )
      .test(
        ErrorMessages().TOO_SMALL,
        ErrorMessages().TOO_SMALL,
        (value) => Number(value) >= 0.00001
      )
      .test(
        ErrorMessages().CHECK_BALANCE,
        ErrorMessages().CHECK_BALANCE,
        (value) => Number(value) <= Number(balance)
      )
      .test(
        ErrorMessages().MAX_DIGIT_AFTER_DECIMAL,
        ErrorMessages().MAX_DIGIT_AFTER_DECIMAL,
        (value) =>
          value
            ? getDigitsAfterDecimal(value) <= MAX_DIGITS_AFTER_DECIMAL
            : false
      ),
  });
};

export const unLockAccountValidations = Yup.object().shape({
  password: Yup.string()
    .required("Required")
    .test("", "Must be only digits", (value) =>
      value ? /^[0-9]+$/.test(value.replace(/\s+/g, "")) : false
    )
    .test(
      "",
      "Must be exactly 5 digits",
      (value) => value?.replace(/\s+/g, "")?.length === 5
    ),
});
export const createAccountValidations = Yup.object().shape({
  name: Yup.string()
    .min(2, "Too Short!")
    .max(25, "Too long!")
    .required("Required"),
  passcode: Yup.string()
    .matches(/^[0-9]+$/, "Must be only digits")
    .min(5, "Must be exactly 5 digits")
    .max(5, "Must be exactly 5 digits")
    .nullable(),
});
export const importAccountValidations = Yup.object().shape({
  name: Yup.string().min(2, "Too Short!").max(30, "Too long!"),
  passcode: Yup.string()
    .matches(/^[0-9]+$/, "Must be only digits")
    .min(5, "Must be exactly 5 digits")
    .max(5, "Must be exactly 5 digits")
    .nullable(),
  mnemonic: Yup.string()
    .required("Required")
    .test("Invalid Mnemonic", "Invalid Mnemonic", (value) => {
      return value?.split(" ").length === 12;
    }),
});

type LimitOrderValidations = {
  isSell?: boolean;
  minMarketPrice: number;
  minQuantity: number;
  maxVolume: number;
  minVolume: number;
  availableBalance: number;
  qtyStepSize: number;
};
export const limitOrderValidations = ({
  isSell,
  minMarketPrice,
  minQuantity,
  minVolume,
  maxVolume,
  availableBalance,
  qtyStepSize,
}: LimitOrderValidations) =>
  Yup.object().shape({
    price: Yup.string()
      .required("Required")
      .test("Valid number", "Must be a number", (value) =>
        value ? /^\d+(\.\d+)?$/.test(value) : false
      )
      .test(
        "Min Price",
        `Minimum price: ${minMarketPrice}`,
        (value) => Number(value || 0) >= minMarketPrice
      ),
    amount: Yup.string()
      .required("Required")
      .test("Valid number", "Must be a number", (value) =>
        value ? /^\d+(\.\d+)?$/.test(value) : false
      )
      .test(
        "Min Quantity",
        `Minimum amount: ${minQuantity}`,
        (value) => Number(value || 0) >= minQuantity
      )
      .test("Balance check", `You don't have enough balance`, (value) =>
        isSell ? +(Number(value) || 0) <= availableBalance : true
      )
      .test(
        "Step Size check",
        `Quantity must be in multiple of ${qtyStepSize}`,
        (value) => {
          const rem = +(Number(value || 0) % qtyStepSize).toFixed();
          return rem === 0;
        }
      ),
    total: Yup.string()
      .test("Valid number", "Must be a number", (value) =>
        value ? /^\d+(\.\d+)?$/.test(value) : false
      )
      .test(
        "Min Volume",
        `Minimum volume required: ${minVolume}`,
        (value) => Number(value || 0) >= minVolume
      )
      .test(
        "Max Volume",
        `Maximum volume allowed: ${maxVolume}`,
        (value) => Number(value || 0) <= maxVolume
      )
      .test("Balance check", `You don't have enough balance`, (value) =>
        isSell ? true : +(Number(value) || 0) <= availableBalance
      ),
  });

type MarketOrderValidations = {
  isSell?: boolean;
  minVolume: number;
  maxVolume: number;
  availableBalance: number;
  qtyStepSize: number;
  currentMarketPrice: number;
};

export const marketOrderValidations = ({
  isSell,
  minVolume,
  maxVolume,
  availableBalance,
  qtyStepSize,
  currentMarketPrice,
}: MarketOrderValidations) =>
  Yup.object().shape({
    amount: Yup.string()
      .test("Valid number", "Must be a number", (value) =>
        value ? /^\d+(\.\d+)?$/.test(value) : false
      )
      .test("Min volume", `Minimum volume required: ${minVolume}`, (value) => {
        return isSell
          ? Number(value || 0) * currentMarketPrice >= minVolume
          : Number(value || 0) >= minVolume;
      })
      .test("Max volume", `Maximum volume allowed: ${maxVolume}`, (value) => {
        return isSell
          ? Number(value || 0) * currentMarketPrice <= maxVolume
          : Number(value || 0) <= maxVolume;
      })
      .test(
        "Balance check",
        `You don't have enough balance`,
        (value) => +(value || 0) <= availableBalance
      )
      .test(
        "Step Size check",
        `Quantity must be in multiple of ${qtyStepSize}`,
        (value) => {
          const rem = +(Number(value || 0) % qtyStepSize).toFixed();
          return rem === 0;
        }
      ),
  });
