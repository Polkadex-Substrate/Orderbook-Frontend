"use client";

import dynamic from "next/dynamic";

const Terms = dynamic(
  () => import("@/components/legal/terms").then((mod) => mod.Terms),
  { ssr: false }
);

export default function Page() {
  return <Terms />;
}
