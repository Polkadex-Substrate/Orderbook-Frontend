"use client";

import dynamic from "next/dynamic";

const Template = dynamic(
  () => import("@/components/faucet/template").then((mod) => mod.Template),
  {
    ssr: false,
  }
);

export default function Page() {
  return <Template />;
}
