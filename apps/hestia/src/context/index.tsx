"use client";

import React, { ReactNode } from "react";
import { createWeb3Modal } from "@web3modal/wagmi/react";
import { State, WagmiProvider } from "wagmi";

import { config, projectId } from "@/config/wagmi";

if (!projectId) throw new Error("Project ID is not defined");

// "use client" modules still EXECUTE on the server during prerender/SSG.
// createWeb3Modal boots the WalletConnect core, whose key-value storage
// probes indexedDB - undefined in Node, which spams the build with
// "ReferenceError: indexedDB is not defined". The modal is browser-only,
// so only initialize it there.
if (typeof window !== "undefined") {
  createWeb3Modal({
    wagmiConfig: config,
    projectId,
    /*
     * BLOCKER B3. Was `enableAnalytics: true`, which ships wallet-modal usage
     * telemetry to Reown. It arrived as scaffold default marked "optional" and
     * nobody asked for it. Sending user behaviour to a third party is a decision
     * that should be made deliberately, not inherited from a template, so it is
     * off until somebody asks for it.
     */
    enableAnalytics: false,
  });
}

export default function Web3ModalProvider({
  children,
  initialState,
}: {
  children: ReactNode;
  initialState?: State;
}) {
  return (
    <WagmiProvider config={config} initialState={initialState}>
      {children}
    </WagmiProvider>
  );
}
