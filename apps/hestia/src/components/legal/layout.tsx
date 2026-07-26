"use client";

import { Typography } from "@mitrabook/ux";
import { PropsWithChildren } from "react";
import Link from "next/link";
import { RiArrowLeftLine } from "@remixicon/react";

import { Header } from "@/components/ui";
import { defaultConfig } from "@/config";
import { EXTERNAL_LINKS } from "@/config/links";

/**
 * Shared chrome for the /legal/* documents.
 *
 * These pages replace the PDFs that used to be linked from the "More" menu on
 * GitHub. Serving them as real pages means they are readable on mobile,
 * linkable to a section, indexable, and versioned with the app instead of
 * living in a separate docs repo.
 */
export function LegalLayout({
  title,
  updated,
  intro,
  children,
}: PropsWithChildren<{
  title: string;
  /** ISO date; rendered verbatim so there's no locale ambiguity. */
  updated: string;
  intro?: string;
}>) {
  return (
    <div className="flex flex-1 flex-col bg-backgroundBase min-h-screen">
      <Header />
      <main className="flex-1 w-full">
        <div className="mx-auto w-full max-w-[820px] px-5 py-10">
          {/* Link straight to the market, not "/": that route is a server-side
              redirect(), which Next's client-side Link navigation does not
              follow — the click appeared to do nothing. */}
          <Link
            href={`/trading/${defaultConfig.landingPageMarket}`}
            className="inline-flex items-center gap-1.5 text-sm opacity-70 hover:opacity-100 transition-opacity mb-8"
          >
            <RiArrowLeftLine className="w-4 h-4" />
            Back to the exchange
          </Link>

          <Typography.Heading size="xl" className="mb-2">
            {title}
          </Typography.Heading>
          <Typography.Text appearance="primary" size="xs" className="block">
            Last updated {updated}
          </Typography.Text>

          {intro && (
            <div className="mt-6 rounded-md border border-attention-base/40 bg-attention-base/10 p-4">
              <Typography.Text size="sm">{intro}</Typography.Text>
            </div>
          )}

          <article
            className={[
              "mt-8 flex flex-col gap-5 text-sm leading-relaxed",
              "[&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-semibold",
              "[&_h3]:mt-4 [&_h3]:text-sm [&_h3]:font-semibold",
              "[&_p]:opacity-90",
              "[&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5 [&_ul]:list-disc",
              "[&_ol]:flex [&_ol]:flex-col [&_ol]:gap-2 [&_ol]:pl-5 [&_ol]:list-decimal",
              "[&_li]:opacity-90 [&_a]:underline [&_a]:underline-offset-2",
            ].join(" ")}
          >
            {children}
          </article>

          <div className="mt-12 border-t border-primary pt-5">
            <Typography.Text size="xs" appearance="primary">
              Questions about this document? Reach us on{" "}
              <a
                href={EXTERNAL_LINKS.discord}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                Discord
              </a>
              .
            </Typography.Text>
          </div>
        </div>
      </main>
    </div>
  );
}
