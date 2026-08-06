"use client";

import dynamic from "next/dynamic";

const ExcludedJurisdictions = dynamic(
  () =>
    import("@/components/legal/excludedJurisdictions").then(
      (mod) => mod.ExcludedJurisdictions
    ),
  { ssr: false }
);

export default function Page() {
  return <ExcludedJurisdictions />;
}
