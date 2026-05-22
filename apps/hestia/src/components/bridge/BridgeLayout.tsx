"use client";

import { ReactNode } from "react";
import { BridgeProvider } from "./BridgeProvider";

export function BridgeLayout({
  children,
}: {
  children: ReactNode;
  initialAssetTicker: string | null;
  initialSourceName: string | null;
  initialDestinationName: string | null;
}) {
  return <BridgeProvider>{children}</BridgeProvider>;
}
