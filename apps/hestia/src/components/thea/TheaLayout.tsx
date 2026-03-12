"use client";

import { TheaProvider } from "@orderbook/core/providers";
import { ReactNode } from "react";

export function TheaLayout({
  children,
  initialAssetTicker,
  initialSourceName,
  initialDestinationName,
}: {
  children: ReactNode;
  initialAssetTicker: string | null;
  initialSourceName: string | null;
  initialDestinationName: string | null;
}) {
  return (
    <TheaProvider
      initialAssetTicker={initialAssetTicker}
      initialSourceName={initialSourceName}
      initialDestinationName={initialDestinationName}
    >
      {children}
    </TheaProvider>
  );
}
