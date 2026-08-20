"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { ReactNode } from "react";

import { EvmWalletProviders } from "@/components/evm/EvmWalletProviders";

const BridgeLayout = dynamic(
  () =>
    import("@/components/bridge/BridgeLayout").then((mod) => mod.BridgeLayout),
  { ssr: false }
);

export default function Layout({ children }: { children: ReactNode }) {
  const params = useSearchParams();
  const assetTicker = params.get("asset");
  const sourceName = params.get("from");
  const destinationName = params.get("to");

  return (
    // The EVM stack is mounted HERE, inside the route, not in the root layout.
    // Mounted above the app-wide providers it changed the element tree by route,
    // so navigating here remounted the keyring and deselected the user's trading
    // account. See components/evm/EvmWalletProviders.tsx.
    <EvmWalletProviders>
      <BridgeLayout
        initialAssetTicker={assetTicker}
        initialSourceName={sourceName}
        initialDestinationName={destinationName}
      >
        {children}
      </BridgeLayout>
    </EvmWalletProviders>
  );
}
