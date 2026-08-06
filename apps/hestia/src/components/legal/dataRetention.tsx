"use client";

import { LegalLayout } from "./layout";

/**
 * Data Retention Policy - testnet edition.
 *
 * NB: this is NOT a port of Polkadex_Data_Retention_Policy.pdf. That document
 * is an internal staff data-protection guideline (it addresses "the employer"
 * and "employees" throughout) and never described what data the exchange keeps
 * about its users - yet it was the document linked from the public menu. This
 * page answers the question a user actually has.
 *
 * Every statement below must be checked against what the deployment really
 * does before this replaces the old link in production.
 */
export function DataRetention() {
  return (
    <LegalLayout
      title="Data Retention Policy"
      updated="25 July 2026"
      intro="This describes what data the Orderbook testnet collects, why, and how long it is kept. It replaces an earlier document that covered internal staff data rather than user data."
    >
      <h2>1. Scope</h2>
      <p>
        This policy covers data processed when you use the Orderbook testnet. It
        does not cover data held by third parties you interact with
        independently - your wallet provider, your browser, or the public
        blockchain itself.
      </p>

      <h2>2. What we do not collect</h2>
      <ul>
        <li>
          <strong>No account registration.</strong> There is no sign-up, no
          username, no password and no email address required to trade.
        </li>
        <li>
          <strong>No private keys.</strong> Keys never leave your device. We
          cannot access them and could not disclose them if compelled.
        </li>
        <li>
          <strong>No identity documents.</strong> No KYC is performed on the
          testnet.
        </li>
      </ul>

      <h2>3. What is processed</h2>
      <h3>On-chain data</h3>
      <p>
        Transactions you submit - deposits, withdrawals, orders, trades and
        transfers - are recorded on a public blockchain. This data is{" "}
        <strong>public and permanent</strong>: it is replicated across network
        nodes and cannot be edited or deleted by us or by you. Wallet addresses
        are pseudonymous but may be linkable to you by third parties.
      </p>

      <h3>Data held in your browser</h3>
      <p>
        Interface preferences (selected market, panel layout, theme,
        acknowledgement of the testnet notice) are stored locally in your
        browser. Trading account keys, if you create a browser wallet, are
        stored in your browser&apos;s storage in encrypted form. Clearing site
        data removes all of this - including any browser wallet, which cannot
        then be recovered unless you have backed up the mnemonic.
      </p>

      <h3>Operational data</h3>
      <p>
        Our servers and infrastructure providers process technical data needed
        to serve the application: IP address, browser and device type, and
        request timestamps. Error and performance monitoring may record
        diagnostic details when something fails, including the page you were on
        and a stack trace.
      </p>

      <h3>Geofencing</h3>
      <p>
        Access from{" "}
        <a href="/legal/excluded-jurisdictions">excluded jurisdictions</a> is
        blocked using IP-based geofencing. IP addresses are evaluated at the
        moment of the request for this purpose and are not retained in a
        profile.
      </p>

      <h2>4. Retention periods</h2>
      <ul>
        <li>
          <strong>On-chain data</strong> - permanent and outside our control,
          for as long as the network exists. Note that testnet state may be
          reset, in which case the history is discarded entirely.
        </li>
        <li>
          <strong>Browser storage</strong> - retained until you clear it. We
          cannot delete it for you.
        </li>
        <li>
          <strong>Server and CDN logs</strong> - retained for a short
          operational period, then deleted or aggregated.
        </li>
        <li>
          <strong>Error monitoring</strong> - retained according to the
          provider&apos;s configured retention window, then deleted.
        </li>
      </ul>

      <h2>5. Sharing</h2>
      <p>
        We do not sell personal data. Data is processed by infrastructure
        providers acting on our behalf - hosting, CDN, RPC endpoints, indexing
        and error monitoring - each only to the extent needed to operate the
        service. Public blockchain data is, by nature, available to everyone.
      </p>

      <h2>6. Your choices</h2>
      <ul>
        <li>
          Clear site data in your browser to remove all locally stored
          preferences and wallets.
        </li>
        <li>
          Use a fresh wallet address for testnet activity if you would rather
          not link it to other activity.
        </li>
        <li>
          Because on-chain records cannot be altered or erased, requests to
          delete them cannot be fulfilled by anyone, including us.
        </li>
      </ul>

      <h2>7. Changes</h2>
      <p>
        This policy will be updated as the service changes, and the date above
        will change with it. Material changes will be announced through our
        community channels.
      </p>
    </LegalLayout>
  );
}
