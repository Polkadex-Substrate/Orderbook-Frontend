"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import type { State } from "wagmi";

import { needsEvmWallet } from "@/config/evmRoutes";

/**
 * Mounts the EVM wallet stack only on the routes that use it.
 *
 * WHAT THIS REMOVES FROM EVERY OTHER PAGE
 * WalletConnect core, the `verify.walletconnect.org` iframe, the injected
 * connector and its MetaMask handshake, EIP-6963 discovery and the Coinbase
 * SDK. All of that used to start on load for every route, because
 * `Web3ModalProvider` wrapped the app from the root layout. Only bridge and
 * faucet ever call a wagmi hook. See config/evmRoutes.ts.
 *
 * WHY next/dynamic AND NOT A PLAIN CONDITIONAL
 * A static import would put the module in the shared client bundle regardless
 * of whether the component renders, so every page would still download and
 * evaluate it - and `@/context` calls `createWeb3Modal` at module scope, which
 * boots WalletConnect the moment the module is evaluated. `dynamic` puts it in
 * its own chunk that is fetched only when this component decides to render it,
 * so on the trading page the code is never fetched, never parsed, never run.
 *
 * `ssr: false` because the whole stack is browser-only; the same reason the
 * root layout guarded `createWeb3Modal` and `enableWalletConnect` on
 * `typeof window`.
 *
 * WHY THE PROVIDER IS NOT SIMPLY MOVED INTO THE ROUTE LAYOUTS
 * That was the first plan and it is worse. The root layout calls `headers()`,
 * which forces dynamic rendering for the whole app; removing it would let other
 * routes render statically, and a client component calling `useSearchParams`
 * without a Suspense boundary fails the BUILD under static rendering. Three
 * components do exactly that. Restructuring the route tree to fix the freeze
 * would have introduced a build-time failure mode in pages unrelated to it.
 */
const Web3ModalProvider = dynamic(() => import("@/context"), { ssr: false });

export const EvmWalletProviders = ({
  children,
  initialState,
}: {
  children: ReactNode;
  /**
   * Cookie-derived wagmi state, computed in the root layout on the server.
   *
   * Still computed for every route: it is a cheap synchronous read of a cookie
   * on the SERVER, it never reaches the client bundle, and passing it down
   * keeps a returning user's connection restored on the routes that mount the
   * provider.
   */
  initialState?: State;
}) => {
  const pathname = usePathname();

  if (!needsEvmWallet(pathname)) return <>{children}</>;

  return (
    <Web3ModalProvider initialState={initialState}>
      {children}
    </Web3ModalProvider>
  );
};
