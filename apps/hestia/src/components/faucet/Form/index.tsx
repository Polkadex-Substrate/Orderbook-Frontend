"use client";

import { Button, Input, Tooltip, Typography } from "@polkadex/ux";
import { RiLoader2Line } from "@remixicon/react";
import { useState } from "react";
import { useFormik } from "formik";
import classNames from "classnames";
import { useSettingsProvider } from "@orderbook/core/providers/public/settings";

import { faucetRegister, faucetDrip } from "../api";

import { SelectToken, type FaucetToken } from "./selectToken";

const FAUCET_TOKENS: FaucetToken[] = [
  { id: "pdex", ticker: "PDEX", name: "Polkadex" },
  { id: "weth", ticker: "WETH", name: "Wrapped Ethereum" },
  { id: "usdc", ticker: "USDC", name: "USD Coin" },
  { id: "usdt", ticker: "USDT", name: "Tether USD" },
];

const initialValues = {
  walletAddress: "",
  tokenId: "",
};

export const Form = () => {
  const [selectedToken, setSelectedToken] = useState<FaucetToken | undefined>();
  const { onHandleAlert, onHandleError } = useSettingsProvider();

  const {
    handleSubmit,
    errors,
    getFieldProps,
    isValid,
    dirty,
    setFieldValue,
    touched,
    isSubmitting,
    resetForm,
  } = useFormik({
    initialValues,
    validate: (values) => {
      const errs: Partial<typeof values> = {};
      if (!values.walletAddress) {
        errs.walletAddress = "Wallet address is required";
      } else if (values.walletAddress.trim().length < 30) {
        errs.walletAddress = "Enter a valid wallet address";
      }
      if (!values.tokenId) {
        errs.tokenId = "Please select a token";
      }
      return errs;
    },
    onSubmit: async (values) => {
      const asset = selectedToken!.ticker;
      try {
        await faucetRegister(values.walletAddress);
        const result = await faucetDrip(values.walletAddress, asset);
        onHandleAlert(
          "Tokens Sent!",
          `${result.amount} has been sent to your wallet`,
        );
        resetForm();
        setSelectedToken(undefined);
      } catch (error) {
        onHandleError(
          "Request Failed",
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
        );
      }
    },
  });

  const handleTokenSelect = (token: FaucetToken) => {
    setSelectedToken(token);
    setFieldValue("tokenId", token.id);
  };

  const disabled = !isValid || !dirty || isSubmitting;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-8 flex-1 max-w-[900px] mx-auto py-8 w-full px-2"
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <Typography.Heading>Token</Typography.Heading>
          <div className="flex flex-col gap-2">
            <Typography.Text appearance="primary">
              Select a token to receive
            </Typography.Text>
            <SelectToken selected={selectedToken}>
              {FAUCET_TOKENS.map((token) => (
                <SelectToken.Card
                  key={token.id}
                  token={token}
                  onSelect={handleTokenSelect}
                />
              ))}
            </SelectToken>
            {touched.tokenId && errors.tokenId && (
              <Typography.Text size="xs" appearance="danger">
                {errors.tokenId}
              </Typography.Text>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Typography.Heading>Wallet Address</Typography.Heading>
          <div className="flex flex-col gap-2">
            <Typography.Text appearance="primary">
              Enter the wallet address to receive tokens
            </Typography.Text>
            <Tooltip open={!!(touched.walletAddress && errors.walletAddress)}>
              <Tooltip.Trigger asChild>
                <div
                  className={classNames(
                    "flex items-center border border-primary rounded-sm",
                    touched.walletAddress &&
                      errors.walletAddress &&
                      "border-danger-base",
                  )}
                >
                  <Input.Vertical
                    type="text"
                    autoComplete="off"
                    placeholder="e.g. 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
                    {...getFieldProps("walletAddress")}
                    className="max-sm:focus:text-[16px] w-full pl-4 py-4"
                  />
                </div>
              </Tooltip.Trigger>
              <Tooltip.Content className="bg-level-5 z-[2] p-1">
                {errors.walletAddress}
              </Tooltip.Content>
            </Tooltip>
          </div>
        </div>
      </div>

      {isSubmitting ? (
        <Button.Solid
          className="w-full py-5 flex items-center gap-1 opacity-60"
          size="md"
          disabled
        >
          <RiLoader2Line className="w-5 h-5 animate-spin" />
          Processing...
        </Button.Solid>
      ) : (
        <Button.Solid
          className="w-full py-5"
          size="md"
          disabled={disabled}
          type="submit"
        >
          Request Tokens
        </Button.Solid>
      )}
    </form>
  );
};
