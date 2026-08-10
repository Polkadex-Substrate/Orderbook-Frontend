"use client";

import dynamic from "next/dynamic";

const Faq = dynamic(() => import("@/components/faq").then((mod) => mod.Faq), {
  ssr: false,
});

export default function Page() {
  return <Faq />;
}
