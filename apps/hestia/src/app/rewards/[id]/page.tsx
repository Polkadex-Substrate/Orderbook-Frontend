"use client";

import dynamic from "next/dynamic";

const Template = dynamic(
  () =>
    import("@/components/rewardsPreview/template").then((mod) => mod.Template),
  {
    ssr: false,
  }
);
export default function Page({ params }: { params: { id: string } }) {
  return <Template id={params.id} />;
}
