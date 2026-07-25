"use client";

import { Typography } from "@mitra/ux";
import Link from "next/link";
import React from "react";

export const Faq = () => {
  if (!fakeNews) return null;
  return (
    <div className="flex flex-col gap-4 max-md:p-4 md:p-6">
      <Typography.Heading type="h2">FAQ</Typography.Heading>
      <div className="flex flex-col gap-2 md:max-w-[200px]">
        {fakeNews.map((e) => (
          <Link
            key={e.id}
            className="text-primary hover:text-primary-base transition-colors duration-300 text-sm"
            href={e.link}
            target="_blank"
          >
            {e.title}
          </Link>
        ))}
      </div>
    </div>
  );
};

const fakeNews = [
  {
    id: 1,
    title: "How to withdraw from Ethereum?",
    link: "#",
  },
  {
    id: 2,
    title: "Why hasn't my withdraw arrived?",
    link: "#",
  },
  {
    id: 0,
    title: "How to withdraw from Polkadot?",
    link: "#",
  },
  {
    id: 3,
    title: "How to find my transaction ID?",
    link: "#",
  },
  {
    id: 4,
    title: "How to withdraw from AssetHub?",
    link: "#",
  },
];
