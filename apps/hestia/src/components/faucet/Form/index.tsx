"use client";

import { Button, Input, Typography } from "@mitrabook/ux";
import { RiLoader2Line } from "@remixicon/react";
import { useEffect, useMemo, useState } from "react";
import { useFormik } from "formik";
import { useAccount } from "wagmi";
import classNames from "classnames";
import { useSettingsProvider } from "@orderbook/core/providers/public/settings";
import { useProfile } from "@orderbook/core/providers/user/profile";
import { getFromStorage, setToStorage } from "@orderbook/core/helpers";

import { faucetRegister, faucetDrip, faucetDripSepolia } from "../api";

import { SelectToken, type FaucetToken } from "./selectToken";
import {
  SelectNetwork,
  DEFAULT_FAUCET_NETWORK,
  FAUCET_NETWORK_STORAGE_KEY,
  findFaucetNetwork,
  type FaucetNetwork,
} from "./selectNetwork";

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
  networkId: DEFAULT_FAUCET_NETWORK.id,
};

export const Form = () => {
  /*
   * Always a network, never undefined. The default is applied synchronously and
   * is the same on the server and the client, so there is no hydration mismatch -
   * which is why the persisted value is read in an effect below rather than in a
   * lazy initialiser. A lazy initialiser touching localStorage renders different
   * HTML on the server than the client and React discards the whole tree.
   */
  const [selectedNetwork, setSelectedNetwork] = useState<FaucetNetwork>(
    DEFAULT_FAUCET_NETWORK
  );
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
  const addressLabel = `${selectedNetwork.name} Wallet Address`;

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

      // No networkId check. It cannot be empty now that the field starts at the
      // default, and its error was never rendered anywhere - so it could only
      // ever have blocked submission invisibly.
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
        if (selectedNetwork.id === "polkadex") {
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
        // resetForm() empties walletAddress, so hand control back to the autofill
        // effect - otherwise a user who typed an address once would face a blank
        // field after every successful drip.
        setAddressEdited(false);
        // The network deliberately survives a successful claim - resetting it
        // sent Sepolia users back to Polkadex after every request. resetForm()
        // restores initialValues.networkId (the default), so the field is put
        // back in step with the network that is actually still selected.
        setFieldValue("networkId", selectedNetwork.id);
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

  /*
   * Restore the persisted network, once, after hydration. Runs only when the
   * stored value differs from the default, so the common case does no work and
   * cannot fight the autofill effect below.
   */
  useEffect(() => {
    const stored = findFaucetNetwork(
      getFromStorage(FAUCET_NETWORK_STORAGE_KEY)
    );
    if (stored && stored.id !== DEFAULT_FAUCET_NETWORK.id) {
      setSelectedNetwork(stored);
      setFieldValue("networkId", stored.id);
    }
    // Mount only. Re-running on setFieldValue identity changes would stamp the
    // stored network back over a choice the user just made.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** The connected address for whichever network is selected. */
  const connectedAddress =
    selectedNetwork.id === "sepolia"
      ? evmAddress
      : selectedAddresses.mainAddress;

  /*
   * Keep the address field in step with the connected wallet, and SELF-HEAL if it
   * is ever emptied.
   *
   * The old version depended only on [network, mainAddress, evmAddress]. Nothing
   * in that list changes when you pick a token, so anything that blanked the field
   * left it blank permanently - there was no code path back to the connected
   * address short of reloading the page. That is the reported bug: "once the box
   * resets it never repopulates".
   *
   * Watching values.walletAddress instead means the field is refilled whenever it
   * is empty, whatever emptied it. That fixes the symptom without needing to know
   * the trigger, and it is the behaviour a user expects anyway: the address of the
   * wallet they are connected with, unless they deliberately changed it.
   *
   * `addressEdited` is what makes "deliberately" work. Without it, refilling on
   * empty would make the field impossible to clear - every keystroke deleting the
   * last character would snap the connected address back, which is worse than the
   * bug. Once the user types or pastes, we stop touching it.
   */
  const [addressEdited, setAddressEdited] = useState(false);

  useEffect(() => {
    if (addressEdited || !connectedAddress) return;
    if (values.walletAddress !== connectedAddress) {
      setFieldValue("walletAddress", connectedAddress);
    }
  }, [addressEdited, connectedAddress, values.walletAddress, setFieldValue]);

  const handleNetworkSelect = (network: FaucetNetwork) => {
    setSelectedNetwork(network);
    setToStorage(FAUCET_NETWORK_STORAGE_KEY, network.id);
    setSelectedToken(undefined);
    setFieldValue("networkId", network.id);
    setFieldValue("tokenId", "");
    // A Polkadex address is meaningless on Sepolia and vice versa, so an address
    // the user typed for the old network must not be kept. Clearing `addressEdited`
    // hands control back to the autofill effect, which fills in the new network's
    // connected address (or leaves it empty if no matching wallet is connected).
    setAddressEdited(false);
    setFieldValue("walletAddress", "");
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
    // No "Select a network" step any more: a network is always selected, so the
    // first thing asked of the user is the one thing only they can answer.
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
    // selectedNetwork dropped: no branch reads it any more.
  }, [selectedToken, values.walletAddress, errors.walletAddress, isSubmitting]);

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
              {/* No longer gated on the network - one is always selected, so
                  disabling this only ever hid a working control. */}
              <SelectToken
                selected={selectedToken}
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

        {/* Always rendered now. This used to be hidden until a network was
            chosen, which meant the form opened as a single dropdown with no
            indication of what came next. The guard is kept only because
            selectedNetwork is what supplies addressLabel below. */}
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
                  // Wraps formik's onChange, so it must come AFTER the spread.
                  // Recording that the value is the user's own is what stops the
                  // self-healing effect above from overwriting what they type.
                  onChange={(e) => {
                    setAddressEdited(true);
                    getFieldProps("walletAddress").onChange(e);
                  }}
                  id={ADDRESS_FIELD_ID}
                  className="max-sm:focus:text-[16px] w-full pl-4 py-4"
                />
                {/* Addresses are always pasted, never typed. Sits inside the
                    field border so it reads as part of the control. */}
                <PasteButton
                  onPaste={(text) => {
                    setAddressEdited(true);
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
