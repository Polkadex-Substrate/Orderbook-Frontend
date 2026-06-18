"use client";

import { Button, Input, Tooltip, Typography } from "@polkadex/ux";
import { RiLoader2Line } from "@remixicon/react";
import { useMemo, useState } from "react";
import { useFormik } from "formik";
import classNames from "classnames";
import { useSettingsProvider } from "@orderbook/core/providers/public/settings";

import { faucetRegister, faucetDrip, faucetDripSepolia } from "../api";
import { SelectToken, type FaucetToken } from "./selectToken";
import { SelectNetwork, type FaucetNetwork } from "./selectNetwork";

const POLKADEX_TOKENS: FaucetToken[] = [
  { id: "pdex", ticker: "PDEX", name: "Polkadex" },
  { id: "weth", ticker: "WETH", name: "Wrapped Ethereum" },
  { id: "usdc", ticker: "USDC", name: "USD Coin" },
  { id: "usdt", ticker: "USDT", name: "Tether USD" },
  { id: "wbtc", ticker: "WBTC", name: "Wrapped Bitcoin" },
  { id: "link", ticker: "LINK", name: "ChainLink Token" },
  { id: "uni", ticker: "UNI", name: "Uniswap" },
  { id: "aave", ticker: "AAVE", name: "Aave Token" },
  { id: "wsteth", ticker: "WSTETH", name: "Wrapped Liquid Staked ETH 2.0" },
];

const SEPOLIA_TOKENS: FaucetToken[] = [
  { id: "usdc", ticker: "USDC", name: "USD Coin" },
  { id: "usdt", ticker: "USDT", name: "Tether USD" },
  { id: "wbtc", ticker: "WBTC", name: "Wrapped Bitcoin" },
  { id: "link", ticker: "LINK", name: "ChainLink Token" },
  { id: "uni", ticker: "UNI", name: "Uniswap" },
  { id: "aave", ticker: "AAVE", name: "Aave Token" },
  { id: "wsteth", ticker: "WSTETH", name: "Wrapped Liquid Staked ETH 2.0" },
];

const EVM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

const initialValues = {
  walletAddress: "",
  tokenId: "",
  networkId: "",
};

export const Form = () => {
  const [selectedNetwork, setSelectedNetwork] = useState<
    FaucetNetwork | undefined
  >();
  const [selectedToken, setSelectedToken] = useState<FaucetToken | undefined>();
  const { onHandleAlert, onHandleError } = useSettingsProvider();

  const availableTokens = useMemo(
    () =>
      selectedNetwork?.id === "sepolia" ? SEPOLIA_TOKENS : POLKADEX_TOKENS,
    [selectedNetwork?.id],
  );

  const addressPlaceholder =
    selectedNetwork?.id === "sepolia"
      ? "e.g. 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
      : "e.g. 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";

  const addressLabel =
    selectedNetwork?.id === "sepolia"
      ? "Ethereum Wallet Address"
      : "Substrate Wallet Address";

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

      if (!values.networkId) {
        errs.networkId = "Please select a network";
      }
      if (!values.tokenId) {
        errs.tokenId = "Please select a token";
      }
      if (!values.walletAddress) {
        errs.walletAddress = "Wallet address is required";
      } else if (selectedNetwork?.id === "sepolia") {
        if (!EVM_ADDRESS_REGEX.test(values.walletAddress.trim())) {
          errs.walletAddress = "Enter a valid Ethereum address (0x...)";
        }
      } else if (values.walletAddress.trim().length < 30) {
        errs.walletAddress = "Enter a valid wallet address";
      }

      return errs;
    },
    onSubmit: async (values) => {
      const address = values.walletAddress.trim();
      const ticker = selectedToken!.ticker;
      try {
        if (selectedNetwork!.id === "polkadex") {
          await faucetRegister(address);
          const result = await faucetDrip(address, ticker);
          onHandleAlert(
            "Tokens Sent!",
            `${result.amount} has been sent to your wallet`,
          );
        } else {
          const result = await faucetDripSepolia(address, ticker);
          onHandleAlert(
            "Tokens Sent!",
            `${result.amount} ${result.token} has been sent to your wallet`,
          );
        }
        resetForm();
        setSelectedNetwork(undefined);
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

  const handleNetworkSelect = (network: FaucetNetwork) => {
    setSelectedNetwork(network);
    setSelectedToken(undefined);
    setFieldValue("networkId", network.id);
    setFieldValue("tokenId", "");
    setFieldValue("walletAddress", "");
  };

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
        {/* Network + Token — equal width side by side */}
        <div className="flex flex-col gap-3">
          <Typography.Heading>Network & Token</Typography.Heading>
          <div className="flex gap-2">
            <div className="flex flex-col gap-2 flex-1">
              <Typography.Text appearance="primary">Network</Typography.Text>
              <SelectNetwork
                selected={selectedNetwork}
                onSelect={handleNetworkSelect}
              />
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <Typography.Text appearance="primary">Token</Typography.Text>
              <SelectToken selected={selectedToken} disabled={!selectedNetwork}>
                {availableTokens.map((token) => (
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
        </div>

        {/* Wallet Address */}
        <div className="flex flex-col gap-3">
          <Typography.Heading>Wallet Address</Typography.Heading>
          <div className="flex flex-col gap-2">
            <Typography.Text appearance="primary">
              {addressLabel}
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
                    placeholder={addressPlaceholder}
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
