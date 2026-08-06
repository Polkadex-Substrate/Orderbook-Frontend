"use client";

import { use } from "react";
import dynamic from "next/dynamic";

const Template = dynamic(
  () =>
    import("@/components/rewardsPreview/template").then((mod) => mod.Template),
  {
    ssr: false,
  }
);
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <Template id={id} />;
}
