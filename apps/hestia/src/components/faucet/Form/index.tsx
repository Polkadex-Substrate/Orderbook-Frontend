"use client";

import { Button, Input, Typography } from "@mitrabook/ux";
import { RiLoader2Line } from "@remixicon/react";
import { useEffect, useMemo, useState } from "react";
import { useFormik } from "formik";
import { useAccount } from "wagmi";
import classNames from "classnames";
import { useSettingsProvider } from "@orderbook/core/providers/public/settings";
import { useProfile } from "@orderbook/core/providers/user/profile";

import { faucetRegister, faucetDrip, faucetDripSepolia } from "../api";

import { SelectToken, type FaucetToken } from "./selectToken";
import { SelectNetwork, type FaucetNetwork } from "./selectNetwork";

import { PasteButton } from "@/components/ui/ReadyToUse";

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

/** Input.Vertical does not forward refs, so the primary button focuses the
 *  address field by id rather than through a ref. */
const ADDRESS_FIELD_ID = "faucet-wallet-address";

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
  const [tokenOpen, setTokenOpen] = useState(false);
  const [networkOpen, setNetworkOpen] = useState(false);
  const { onHandleAlert, onHandleError } = useSettingsProvider();
  const { selectedAddresses } = useProfile();
  // Connected EVM wallet (wagmi) - lets Sepolia requests autofill the same
  // way Polkadex requests already autofill from the profile address.
  const { address: evmAddress } = useAccount();

  const availableTokens = useMemo(
    () =>
      selectedNetwork?.id === "sepolia" ? SEPOLIA_TOKENS : POLKADEX_TOKENS,
    [selectedNetwork?.id]
  );

  const addressPlaceholder =
    selectedNetwork?.id === "sepolia"
      ? "e.g. 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
      : "e.g. 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";

  // Derived from the network the user just picked, so this label always
  // matches the dropdown above it. It used to name the chain FAMILY
  // ("Substrate Wallet Address"), which is developer vocabulary the rest of
  // the app never shows: every other surface says "Polkadex Testnet".
  const addressLabel = selectedNetwork
    ? `${selectedNetwork.name} Wallet Address`
    : "Wallet Address";

  const {
    handleSubmit,
    errors,
    getFieldProps,
    values,
    setFieldValue,
    setFieldTouched,
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
            `${result.amount} has been sent to your wallet`
          );
        } else {
          const result = await faucetDripSepolia(address, ticker);
          onHandleAlert(
            "Tokens Sent!",
            `${result.amount} ${result.token} has been sent to your wallet`
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
            : "Something went wrong. Please try again."
        );
      }
    },
  });

  useEffect(() => {
    if (selectedNetwork?.id === "polkadex" && selectedAddresses.mainAddress) {
      setFieldValue("walletAddress", selectedAddresses.mainAddress);
    }
    if (selectedNetwork?.id === "sepolia" && evmAddress) {
      setFieldValue("walletAddress", evmAddress);
    }
  }, [
    selectedNetwork?.id,
    selectedAddresses.mainAddress,
    evmAddress,
    setFieldValue,
  ]);

  const handleNetworkSelect = (network: FaucetNetwork) => {
    setSelectedNetwork(network);
    setSelectedToken(undefined);
    setFieldValue("networkId", network.id);
    setFieldValue("tokenId", "");
    const autoAddress =
      network.id === "polkadex" && selectedAddresses.mainAddress
        ? selectedAddresses.mainAddress
        : network.id === "sepolia" && evmAddress
          ? evmAddress
          : "";
    setFieldValue("walletAddress", autoAddress);
  };

  const handleTokenSelect = (token: FaucetToken) => {
    setSelectedToken(token);
    setFieldValue("tokenId", token.id);
  };

  /**
   * Primary button states the next required step AND performs it, matching
   * the bridge form.
   *
   * Previously it only did the first half: the label advanced but the button
   * stayed `disabled`, so "Select a token" rendered grey and did nothing when
   * clicked. Beside the bridge - where the equivalent step is a live pink
   * button - it read as though the faucet was broken. An actionable step is
   * now enabled; only a genuine validation failure is disabled.
   */
  const primaryAction = useMemo(():
    | { label: string; onClick: () => void }
    | { label: string; submit: true }
    | { label: string; blocked: true } => {
    if (!selectedNetwork)
      return { label: "Select a network", onClick: () => setNetworkOpen(true) };
    if (!selectedToken)
      return { label: "Select a token", onClick: () => setTokenOpen(true) };
    if (!values.walletAddress)
      return {
        label: "Enter a wallet address",
        onClick: () => document.getElementById(ADDRESS_FIELD_ID)?.focus(),
      };
    if (errors.walletAddress)
      return { label: errors.walletAddress, blocked: true };
    if (isSubmitting) return { label: "Requesting...", blocked: true };
    return { label: "Request Tokens", submit: true };
  }, [
    selectedNetwork,
    selectedToken,
    values.walletAddress,
    errors.walletAddress,
    isSubmitting,
  ]);

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 max-w-[640px] mx-auto py-8 w-full px-4"
    >
      <div className="flex flex-col gap-6 border border-primary rounded-md bg-level-0 p-6 max-sm:p-4">
        {/* Network + Token - equal width side by side */}
        <div className="flex flex-col gap-3">
          <Typography.Heading>Network & Token</Typography.Heading>
          <div className="flex gap-2">
            <div className="flex flex-col gap-2 flex-1">
              <Typography.Text appearance="primary">Network</Typography.Text>
              <SelectNetwork
                selected={selectedNetwork}
                onSelect={handleNetworkSelect}
                open={networkOpen}
                onOpenChange={setNetworkOpen}
              />
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <Typography.Text appearance="primary">Token</Typography.Text>
              <SelectToken
                selected={selectedToken}
                disabled={!selectedNetwork}
                open={tokenOpen}
                onOpenChange={setTokenOpen}
              >
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

        {/* Wallet Address - only shown after network is selected */}
        {selectedNetwork && (
          <div className="flex flex-col gap-3">
            <Typography.Heading>Wallet Address</Typography.Heading>
            <div className="flex flex-col gap-2">
              <Typography.Text appearance="primary">
                {addressLabel}
              </Typography.Text>
              <div
                className={classNames(
                  "flex items-center border rounded-sm",
                  touched.walletAddress && errors.walletAddress
                    ? "border-danger-base"
                    : "border-primary"
                )}
              >
                <Input.Vertical
                  type="text"
                  autoComplete="off"
                  placeholder={addressPlaceholder}
                  {...getFieldProps("walletAddress")}
                  id={ADDRESS_FIELD_ID}
                  className="max-sm:focus:text-[16px] w-full pl-4 py-4"
                />
                {/* Addresses are always pasted, never typed. Sits inside the
                    field border so it reads as part of the control. */}
                <PasteButton
                  onPaste={(text) => {
                    setFieldValue("walletAddress", text);
                    setFieldTouched("walletAddress", true);
                  }}
                />
              </div>
              {touched.walletAddress && errors.walletAddress && (
                <Typography.Text size="xs" className="text-danger-base">
                  {errors.walletAddress}
                </Typography.Text>
              )}
              {selectedNetwork?.id === "sepolia" && evmAddress && (
                <button
                  type="button"
                  className="self-start text-xs opacity-80 hover:opacity-100 hover:underline"
                  onClick={() => setFieldValue("walletAddress", evmAddress)}
                >
                  Use connected wallet ({evmAddress.slice(0, 6)}…
                  {evmAddress.slice(-4)})
                </button>
              )}
            </div>
          </div>
        )}
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
          type={"submit" in primaryAction ? "submit" : "button"}
          disabled={"blocked" in primaryAction}
          onClick={
            "onClick" in primaryAction ? primaryAction.onClick : undefined
          }
        >
          {primaryAction.label}
        </Button.Solid>
      )}
    </form>
  );
};
