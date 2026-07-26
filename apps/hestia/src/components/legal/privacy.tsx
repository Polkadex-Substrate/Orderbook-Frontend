"use client";

import { LegalLayout } from "./layout";

/**
 * Privacy Policy - testnet edition.
 *
 * Adapted from Polkadex_Privacy_Policy.pdf (26/10/2022). Structure, legal
 * bases and the data-subject rights list are preserved from the original,
 * which is GDPR-framed (Polkadex Inc, BVI, Estonian PDPA). Changes:
 *  - website list replaced with the testnet host
 *  - marketing-email processing removed (the testnet collects no email)
 *  - retention now links to the in-app page instead of a GitHub PDF
 *  - blockchain-specific limits on erasure made explicit
 *
 * CONFIRM BEFORE PRODUCTION: the controller entity below (Polkadex Inc, BVI)
 * is carried over from the 2022 document and will change with the rebrand.
 * The contact address is gdpr@polkadex.ee - an interim address; make sure the
 * mailbox exists and is monitored, since this page invites rights requests to
 * it and GDPR sets response deadlines.
 */
export function Privacy() {
  return (
    <LegalLayout
      title="Privacy Policy"
      updated="25 July 2026"
      intro="The Orderbook testnet requires no account, no email address and no identity documents. This policy explains the limited personal data that is processed when you use it."
    >
      <h2>1. Introduction</h2>
      <p>
        Protection of personal data is important to us. This Privacy Policy
        describes the personal data collected when you use the Orderbook
        testnet, the purposes it is used for, and who has access to it.
      </p>
      <p>
        It is possible to use the Orderbook without providing identifying
        personal data - there is no registration, and no identity verification
        is performed on the testnet. We process personal data in compliance with
        applicable data protection law, including Regulation (EU) 2016/679 (the{" "}
        <strong>GDPR</strong>) and the Personal Data Protection Act of Estonia.
      </p>

      <h2>2. Terms</h2>
      <ul>
        <li>
          <strong>Data subject</strong> - an identified or identifiable natural
          person whose data is processed.
        </li>
        <li>
          <strong>Personal data</strong> - any information concerning an
          identified or identifiable natural person, including location
          information and network identifiers.
        </li>
        <li>
          <strong>Processing</strong> - any operation performed on personal
          data, including collection, storage, use, transfer, restriction and
          erasure.
        </li>
        <li>
          <strong>Controller</strong> - the party determining the purposes and
          means of processing.
        </li>
        <li>
          <strong>Processor</strong> - a party processing personal data on
          behalf of the controller.
        </li>
      </ul>

      <h2>3. Data controller</h2>
      <p>
        Company name: Polkadex Inc
        <br />
        Address: Craigmuir Chambers, Road Town, Tortola, VG 1110, British Virgin
        Islands
        <br />
        E-mail: <a href="mailto:gdpr@polkadex.ee">gdpr@polkadex.ee</a>
      </p>

      <h2>4. Types of personal data and purposes</h2>

      <h3>4.1 Providing the service</h3>
      <p>
        Technical data - IP address, browser and device type, and request
        timestamps - is processed so that the application can be served, secured
        and debugged. The legal basis is our legitimate interest in operating
        and securing the service.
      </p>

      <h3>4.2 Compliance with legal acts</h3>
      <p>
        Your IP address is processed to carry out geoblocking of{" "}
        <a href="/legal/excluded-jurisdictions">excluded jurisdictions</a> -
        geographic regions where we do not offer the service. The legal basis is
        our legitimate interest in complying with applicable law. The assessment
        is made at the moment of the request; IP addresses are not retained in a
        user profile.
      </p>

      <h3>4.3 On-chain activity</h3>
      <p>
        Transactions you submit are recorded on a public blockchain. This data
        is public and permanent; it is not held by us and cannot be altered or
        removed by us. Wallet addresses are pseudonymous but may be linkable to
        you by third parties.
      </p>
      <p>
        Note that no marketing communications are sent from the testnet - we do
        not collect email addresses, so the consent-based processing described
        in the previous version of this policy does not apply here.
      </p>

      <h2>5. Recipients</h2>
      <p>
        We disclose personal data to our personnel strictly on a need-to-know
        basis. In certain cases we disclose personal data to co-operation
        partners providing services necessary to operate the Orderbook - for
        example IT and infrastructure providers, RPC and indexing services, and
        error monitoring. In most cases these constitute data processors under
        the GDPR, and personal data is disclosed to them only where a data
        processing agreement under Article 28(3) GDPR is in place.
      </p>
      <p>We do not sell personal data.</p>

      <h2>6. Storage of personal data</h2>
      <p>
        We store personal data only for as long as necessary to fulfil the
        purposes described in section 4, and no longer. Specific retention
        periods for each category are set out in our{" "}
        <a href="/legal/data-retention">Data Retention Policy</a>.
      </p>

      <h2>7. Security</h2>
      <p>
        We have implemented appropriate technical and organisational measures to
        protect personal data, supported by internal information security
        policies that are binding on everyone in the organisation. Note that
        your private keys are never transmitted to us - they remain on your
        device, and we could not disclose them even if required to.
      </p>

      <h2>8. Your rights</h2>
      <p>
        By contacting us at{" "}
        <a href="mailto:gdpr@polkadex.ee">gdpr@polkadex.ee</a> you may exercise
        the following rights:
      </p>
      <ul>
        <li>the right to view your personal data;</li>
        <li>the right to correct your personal data;</li>
        <li>the right to delete your personal data;</li>
        <li>the right to transfer your personal data;</li>
        <li>
          the right not to be judged solely on the basis of automated
          processing;
        </li>
        <li>
          the right to withdraw your consent, where processing is consent-based.
        </li>
      </ul>
      <p>
        In certain cases you also have the right to demand restriction of
        processing, and the right to object to processing.
      </p>
      <p>
        Two practical limits apply here. Because there is no account, we
        generally cannot link a request to a specific individual, which limits
        what an access or deletion request can return. And{" "}
        <strong>data recorded on a public blockchain cannot be erased</strong>{" "}
        by us or by anyone else.
      </p>
      <p>
        If you believe your privacy has been compromised, please contact us. You
        also have the right to lodge a complaint with the data protection
        supervisory authority of your country of residence.
      </p>

      <h2>9. Changes</h2>
      <p>
        We may amend this Privacy Policy. The current version is always the one
        published on this page, and the date above changes when it is amended.
      </p>
    </LegalLayout>
  );
}
