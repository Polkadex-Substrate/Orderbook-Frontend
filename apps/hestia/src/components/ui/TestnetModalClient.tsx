"use client";

import dynamic from "next/dynamic";

const TestnetModal = dynamic(
  () => import("./testnetModal").then((m) => m.TestnetModal),
  { ssr: false }
);

export default function TestnetModalClient() {
  return <TestnetModal />;
}
