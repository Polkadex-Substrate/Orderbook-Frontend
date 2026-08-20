"use client";

import { ReactNode, createContext, useContext } from "react";
import type { State } from "wagmi";

/**
 * Carries the cookie-derived wagmi state from the root layout to the routes that
 * mount the EVM provider.
 *
 * WHY IT IS A CONTEXT AND NOT A PROP
 * The value is computed on the SERVER, in the root layout, from the request
 * cookie. Only `/bridge` and `/faucet` need it. Passing it down as a prop would
 * mean the root layout wrapping children in something that varies by route -
 * which is exactly the bug this file exists to avoid. A context provider always
 * renders, always in the same position, so the element tree below it never
 * changes shape.
 *
 * THE BUG. `EvmWalletProviders` used to sit above every other provider in the
 * root layout and switch between `<>{children}</>` and
 * `<Web3ModalProvider>{children}</Web3ModalProvider>` based on `usePathname()`.
 * Navigating from /trading to /bridge flipped that condition, so React saw the
 * children at a different position in the tree and UNMOUNTED AND REMOUNTED
 * EVERYTHING BELOW - including the keyring, the profile and every provider in
 * DynamicProviders.
 *
 * The keyring then reloaded, reported `isReady` before its addresses had
 * populated, and the stale-selection guard deselected the user's trading
 * account:
 *
 *   "Your trading account was deselected because its key is not in this
 *    browser."
 *
 * Reported as: moving from trade to bridge shows that error, and coming back to
 * trade requires connecting the wallet again. ORDERBOOK-TESTNET-G recorded it
 * with `signableCount: 0` and `hasExtensionAddress: false` on /bridge - both
 * stores empty at once, which is a remount, not a user without accounts.
 *
 * THE RULE THIS ENCODES. A conditional wrapper around long-lived providers is a
 * remount waiting to happen. Anything whose presence depends on the route
 * belongs INSIDE the route, below the providers that must survive navigation.
 */
const EvmInitialStateContext = createContext<State | undefined>(undefined);

export const EvmInitialStateProvider = ({
  value,
  children,
}: {
  value?: State;
  children: ReactNode;
}) => (
  <EvmInitialStateContext.Provider value={value}>
    {children}
  </EvmInitialStateContext.Provider>
);

/** Cookie-derived wagmi state, or undefined when there was none. */
export const useEvmInitialState = () => useContext(EvmInitialStateContext);
