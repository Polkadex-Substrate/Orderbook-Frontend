"use client";

import { ReactNode } from "react";

import { EvmWalletProviders } from "@/components/evm/EvmWalletProviders";

/**
 * The faucet needs the EVM stack: `components/faucet/Form` calls `useAccount`,
 * because Sepolia drips go to an Ethereum address.
 *
 * This layout exists solely to mount that stack for this route. It used to be
 * mounted for the whole app from the root layout, which meant the trading page
 * booted WalletConnect, the verify iframe, the MetaMask handshake, EIP-6963
 * discovery and the Coinbase SDK for no reason.
 *
 * It must be mounted HERE and not above the app-wide providers. A wrapper in the
 * root layout that appears and disappears with the route moves the whole subtree
 * on navigation, and React remounts it - which reloaded the keyring and
 * deselected the user's trading account. See
 * components/evm/EvmWalletProviders.tsx.
 */
export default function Layout({ children }: { children: ReactNode }) {
  return <EvmWalletProviders>{children}</EvmWalletProviders>;
}
