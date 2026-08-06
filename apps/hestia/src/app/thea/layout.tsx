"use client";

import { TheaProvider } from "@orderbook/core/providers";
import { useSearchParams } from "next/navigation";
import { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  const params = useSearchParams();
  const assetTicker = params.get("asset");
  const sourceName = params.get("from");
  const destinationName = params.get("to");

  return (
    <TheaProvider
      initialAssetTicker={assetTicker}
      initialSourceName={sourceName}
      initialDestinationName={destinationName}
    >
      {children}
    </TheaProvider>
  );
}
