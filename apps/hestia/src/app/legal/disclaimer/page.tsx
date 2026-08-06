"use client";

import dynamic from "next/dynamic";

const Disclaimer = dynamic(
  () => import("@/components/legal/disclaimer").then((mod) => mod.Disclaimer),
  { ssr: false }
);

export default function Page() {
  return <Disclaimer />;
}
