"use client";

import Link from "next/link";
import { Typography } from "@mitrabook/ux";
import { RiSearchLine } from "@remixicon/react";

/**
 * Shown when the market in the URL does not exist.
 *
 * WHY THIS SCREEN HAD TO BE BUILT BEFORE THE URL FORMAT COULD CHANGE
 * `getCurrentMarket` used to end in `?? markets[0]`, so an unrecognised pair
 * quietly loaded whichever market sorted first. The address bar said one thing
 * and the order form was wired to another. Nobody would report that, because
 * nothing appears to be wrong.
 *
 * Changing the URL format multiplies the ways an id can fail to match, so the
 * silent fallback had to go first. What replaces it has to be visible: say the
 * pair was not found, quote it back so a typo is obvious, and offer the way out.
 */
export const MarketNotFound = ({
  id,
  href,
}: {
  id: string;
  /** Where "Browse markets" goes: a market we know exists. */
  href: string;
}) => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-primary bg-level-1">
      <RiSearchLine className="h-7 w-7 text-primary" />
    </div>

    <Typography.Heading size="lg">Market not found</Typography.Heading>

    <Typography.Paragraph
      size="sm"
      appearance="primary"
      className="max-w-[46ch]"
    >
      {/* The id is quoted rather than described, because the usual cause is a
          mistyped or truncated link and seeing it is what makes that obvious. */}
      There is no market called <span className="font-bold">{id}</span> on this
      network. It may have been renamed, retired, or the link may be incomplete.
    </Typography.Paragraph>

    <Link
      href={href}
      className="rounded-sm bg-primary-hover px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
    >
      Browse markets
    </Link>
  </div>
);
