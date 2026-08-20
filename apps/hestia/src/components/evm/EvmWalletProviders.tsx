"use client";

import { ReactNode } from "react";
import dynamic from "next/dynamic";

import { useEvmInitialState } from "./evmInitialState";

/**
 * Mounts the EVM wallet stack for one route subtree.
 *
 * RENDER THIS INSIDE A ROUTE, NEVER IN THE ROOT LAYOUT. That distinction is the
 * whole point of this file, and getting it wrong caused a worse bug than the one
 * it was fixing.
 *
 * WHAT IT REMOVES FROM EVERY OTHER PAGE
 * WalletConnect core, the `verify.walletconnect.org` iframe, the injected
 * connector and its MetaMask handshake, EIP-6963 discovery and the Coinbase SDK.
 * All of it used to start on load for every route, because `Web3ModalProvider`
 * wrapped the app from the root layout. Only bridge and faucet call a wagmi
 * hook. See config/evmRoutes.ts.
 *
 * THE FIRST ATTEMPT, AND WHY IT WAS WRONG
 * This component originally lived in the root layout and chose per route:
 *
 *     if (!needsEvmWallet(pathname)) return <>{children}</>;
 *     return <Web3ModalProvider ...>{children}</Web3ModalProvider>;
 *
 * That does remove the stack from other pages. It also means the children sit at
 * a DIFFERENT POSITION in the element tree depending on the route, so navigating
 * from /trading to /bridge unmounted and remounted every provider beneath it -
 * the keyring, the profile, the whole of DynamicProviders. The keyring reloaded,
 * announced `isReady` before its addresses arrived, and the stale-selection guard
 * deselected the user's trading account. Moving to the bridge logged you out of
 * trading, and coming back required reconnecting the wallet.
 *
 * Mounted inside the route instead, the toggle costs nothing: leaving the route
 * unmounts that subtree anyway, and everything that must survive navigation
 * lives above it, untouched.
 *
 * WHY next/dynamic AND NOT A PLAIN IMPORT
 * A static import lands in the shared client bundle whether or not the component
 * renders, and `@/context` calls `createWeb3Modal` at module scope - so
 * evaluating the module is what boots WalletConnect. As a `dynamic` chunk it is
 * fetched only when this component renders, which is only on these routes.
 *
 * `ssr: false` because the whole stack is browser-only.
 */
const Web3ModalProvider = dynamic(() => import("@/context"), { ssr: false });

export const EvmWalletProviders = ({ children }: { children: ReactNode }) => {
  // From context, not a prop: the root layout must not wrap children in
  // anything route-dependent. See evmInitialState.tsx.
  const initialState = useEvmInitialState();

  return (
    <Web3ModalProvider initialState={initialState}>
      {children}
    </Web3ModalProvider>
  );
};
