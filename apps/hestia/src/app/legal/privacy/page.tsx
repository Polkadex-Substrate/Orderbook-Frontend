"use client";

import dynamic from "next/dynamic";

const Privacy = dynamic(
  () => import("@/components/legal/privacy").then((mod) => mod.Privacy),
  { ssr: false }
);

export default function Page() {
  return <Privacy />;
}
