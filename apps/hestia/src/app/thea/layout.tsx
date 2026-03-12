"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { ReactNode } from "react";

const TheaLayout = dynamic(
  () => import("@/components/thea/TheaLayout").then((mod) => mod.TheaLayout),
  { ssr: false }
);

export default function Layout({ children }: { children: ReactNode }) {
  const params = useSearchParams();
  const assetTicker = params.get("asset");
  const sourceName = params.get("from");
  const destinationName = params.get("to");

  return (
    <TheaLayout
      initialAssetTicker={assetTicker}
      initialSourceName={sourceName}
      initialDestinationName={destinationName}
    >
      {children}
    </TheaLayout>
  );
}
