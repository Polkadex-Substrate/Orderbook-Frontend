"use client";

import { Typography } from "@mitrabook/ux";

import { LegalLayout } from "./layout";

/**
 * Excluded jurisdictions.
 *
 * Sourced from the FATF's own publications of 19 June 2026 (the June plenary):
 *  - "High-Risk Jurisdictions subject to a Call for Action" (the black list)
 *  - "Jurisdictions under Increased Monitoring" (the grey list, 22 entries)
 * plus the comprehensively-sanctioned territories and the US exclusion that
 * were carried over from the previous list.
 *
 * NB the FATF revises these lists at each plenary (roughly February, June and
 * October). This page must be reviewed after each one - see the note rendered
 * at the foot of the page.
 */

// FATF "Call for Action" - 19 June 2026 (unchanged at that plenary).
const CALL_FOR_ACTION = [
  "Democratic People's Republic of Korea (DPRK)",
  "Iran",
  "Myanmar",
];

// FATF "Jurisdictions under Increased Monitoring" - 19 June 2026.
// Bosnia and Herzegovina and Iraq added; Algeria and Namibia removed.
const INCREASED_MONITORING = [
  "Angola",
  "Bolivia",
  "Bosnia and Herzegovina",
  "British Virgin Islands",
  "Bulgaria",
  "Cameroon",
  "Côte d'Ivoire",
  "Democratic Republic of the Congo",
  "Haiti",
  "Iraq",
  "Kenya",
  "Kuwait",
  "Lao People's Democratic Republic",
  "Lebanon",
  "Monaco",
  "Nepal",
  "Papua New Guinea",
  "South Sudan",
  "Syria",
  "Venezuela",
  "Vietnam",
  "Yemen",
];

// Carried over from the previous list and from comprehensive sanctions
// programmes, independent of FATF listing status.
const OTHER_RESTRICTED = [
  "United States of America (and its territories)",
  "Cuba",
  "Russian Federation",
  "Belarus",
  "Crimea, and the Donetsk and Luhansk regions of Ukraine",
];

const Section = ({
  title,
  note,
  items,
}: {
  title: string;
  note: string;
  items: string[];
}) => (
  <section className="flex flex-col gap-3">
    <h2>{title}</h2>
    <Typography.Text size="xs" appearance="primary" className="block">
      {note}
    </Typography.Text>
    <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2 pl-5 list-disc">
      {items.map((c) => (
        <li key={c} className="opacity-90">
          {c}
        </li>
      ))}
    </ul>
  </section>
);

export function ExcludedJurisdictions() {
  return (
    <LegalLayout
      title="Excluded Jurisdictions"
      updated="25 July 2026"
      intro="This is a testnet. No tokens available here have monetary value. These restrictions are published so that the same controls apply consistently when the exchange operates with assets of real value."
    >
      <p>
        You may not access or use the Orderbook if you are a citizen or resident
        of, located in, or incorporated or registered in any of the
        jurisdictions listed below, or if you are otherwise a Restricted Person
        under the <a href="/legal/terms">Terms of Use</a>. Using a VPN or any
        other means to circumvent these restrictions is prohibited.
      </p>

      <Section
        title="1. High-risk jurisdictions subject to a call for action"
        note="FATF “black list”, as published 19 June 2026."
        items={CALL_FOR_ACTION}
      />

      <Section
        title="2. Jurisdictions under increased monitoring"
        note="FATF “grey list”, as published 19 June 2026 (22 jurisdictions)."
        items={INCREASED_MONITORING}
      />

      <Section
        title="3. Other restricted jurisdictions"
        note="Excluded on the basis of comprehensive sanctions programmes or regulatory restrictions, independent of FATF listing."
        items={OTHER_RESTRICTED}
      />

      <h2>4. Catch-all</h2>
      <p>
        Any jurisdiction in which use of the Orderbook, or the offering of the
        products or services available through it, is prohibited, restricted or
        unauthorised in any form or manner, whether in whole or in part, under
        the laws, regulatory requirements or rules of that jurisdiction.
      </p>

      <h2>How this list is maintained</h2>
      <p>
        Sections 1 and 2 mirror the two lists the Financial Action Task Force
        publishes at each plenary meeting, held roughly in February, June and
        October. This page reflects the plenary of 19 June 2026. The
        authoritative sources are{" "}
        <a
          href="https://www.fatf-gafi.org/en/publications/High-risk-and-other-monitored-jurisdictions/call-for-action-june-2026.html"
          target="_blank"
          rel="noreferrer"
        >
          the FATF call-for-action list
        </a>{" "}
        and{" "}
        <a
          href="https://www.fatf-gafi.org/en/publications/High-risk-and-other-monitored-jurisdictions/increased-monitoring-june-2026.html"
          target="_blank"
          rel="noreferrer"
        >
          the FATF increased-monitoring list
        </a>
        ; where this page and the FATF publications differ, the FATF
        publications govern.
      </p>
    </LegalLayout>
  );
}
