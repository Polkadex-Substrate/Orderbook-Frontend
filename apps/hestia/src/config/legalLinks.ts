/**
 * The legal documents, in one place.
 *
 * These were previously listed only inside the header's "More" dropdown,
 * mixed in with Analytics. That made the header carry compliance links while
 * burying an actual product feature, and it meant the list was duplicated
 * between the desktop header and the mobile menu with no guarantee they
 * matched.
 *
 * Now rendered by the footer (desktop) and the responsive menu (mobile), both
 * from this array, so the two can never drift.
 */
export const LEGAL_LINKS = [
  { href: "/legal/terms", label: "Terms of use" },
  { href: "/legal/privacy", label: "Privacy policy" },
  { href: "/legal/disclaimer", label: "Disclaimer" },
  { href: "/legal/excluded-jurisdictions", label: "Excluded jurisdictions" },
  { href: "/legal/data-retention", label: "Data retention" },
] as const;
