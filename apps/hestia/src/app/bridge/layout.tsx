"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { ReactNode } from "react";

const BridgeLayout = dynamic(
  () => import("@/components/bridge/BridgeLayout").then((mod) => mod.BridgeLayout),
  { ssr: false }
);

export default function Layout({ children }: { children: ReactNode }) {
  const params = useSearchParams();
  const assetTicker = params.get("asset");
  const sourceName = params.get("from");
  const destinationName = params.get("to");

  return (
    <BridgeLayout
      initialAssetTicker={assetTicker}
      initialSourceName={sourceName}
      initialDestinationName={destinationName}
    >
      {children}
    </BridgeLayout>
  );
}
