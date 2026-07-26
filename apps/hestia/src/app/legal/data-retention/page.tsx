"use client";

import dynamic from "next/dynamic";

const DataRetention = dynamic(
  () =>
    import("@/components/legal/dataRetention").then((mod) => mod.DataRetention),
  { ssr: false }
);

export default function Page() {
  return <DataRetention />;
}
