"use client";

import { LegalLayout } from "./layout";

/**
 * Terms of Use - testnet edition.
 *
 * Adapted from Polkadex_Terms_of_Use.pdf (26/10/2022). Substantive changes:
 *  - scoped to the testnet: no real value, no consideration, resettable state
 *  - Token Sale language removed (there is no sale here)
 *  - website list replaced with the current testnet host
 *  - Restricted Persons now points at the in-app jurisdictions page
 *  - "no financial advice" and "no warranty" positions retained verbatim in
 *    substance, since they apply with more force on a testnet, not less
 */
export function Terms() {
  return (
    <LegalLayout
      title="Terms of Use"
      updated="25 July 2026"
      intro="These terms govern use of the Orderbook TESTNET. Tokens on this network are test assets with no monetary value and cannot be exchanged for anything of value. Network state may be reset at any time without notice."
    >
      <h2>1. Definitions</h2>
      <ul>
        <li>
          <strong>User</strong> - the individual accessing or using the
          Orderbook testnet (&quot;you&quot;, &quot;your&quot;).
        </li>
        <li>
          <strong>Test Token</strong> - a valueless token issued on the testnet
          for evaluation and development purposes only. Test Tokens are not
          securities, commodities, money, or a store of value, and are not
          redeemable for anything.
        </li>
        <li>
          <strong>Orderbook</strong> - the decentralised exchange interface made
          available at this domain, operating against a test network.
        </li>
        <li>
          <strong>Sanction</strong> - any punitive or coercive measure
          administered by OFAC or another United States authority, the United
          Nations Security Council, the European Union, His Majesty&apos;s
          Treasury of the United Kingdom, or the authorities of the country in
          which you are a citizen or resident.
        </li>
      </ul>

      <h2>2. General</h2>
      <p>
        By accessing or using the Orderbook you agree to be bound by these Terms
        of Use. These terms are updated from time to time and become effective
        as soon as they are posted here. Everything provided through the
        Orderbook is provided on an &quot;as is&quot; and &quot;as
        available&quot; basis.
      </p>
      <p>
        If you do not agree with any part of these terms, do not use the
        Orderbook.
      </p>

      <h2>3. Nature of the testnet</h2>
      <ul>
        <li>
          The Orderbook testnet exists so that users and developers can evaluate
          the software. It is not a live trading venue.
        </li>
        <li>
          Test Tokens have <strong>no monetary value</strong>, are distributed
          free of charge through a faucet, and confer no rights of any kind.
        </li>
        <li>
          Balances, orders, trade history and the network itself{" "}
          <strong>may be reset, rolled back or discarded at any time</strong>,
          without notice and without compensation.
        </li>
        <li>
          Never send mainnet assets or real funds to any address associated with
          this testnet. Assets sent in error cannot be recovered.
        </li>
      </ul>

      <h2>4. Non-custodial service</h2>
      <p>
        Ownership of your wallet and of any Test Tokens remains with you at all
        times; nothing is transferred to us. We do not hold your keys and cannot
        move, freeze or recover your assets. In the event of loss, theft or
        compromise of your keys or passwords, we are not able to restore access.
      </p>

      <h2>5. Risk</h2>
      <ul>
        <li>
          Access may be interrupted by system or network downtime, chain halts,
          upgrades, or for security or regulatory reasons, at our discretion or
          outside our control. We are not liable for any interruption or delay.
        </li>
        <li>
          Cryptography and blockchain technology remain under active
          development. Use of the Orderbook carries technology and security
          risks, including risks arising from defects in the software.
        </li>
        <li>
          You are solely responsible for the security and confidentiality of
          your private keys and passwords.
        </li>
      </ul>

      <h2>6. Representations and warranties</h2>
      <p>By using the Orderbook you represent and warrant that:</p>
      <ol>
        <li>
          Your use is lawful in your jurisdiction, and these terms constitute a
          valid and binding obligation on you.
        </li>
        <li>
          You are of legal age and have capacity to enter into these terms.
        </li>
        <li>
          You are not a Restricted Person, and you are not accessing the
          Orderbook from an excluded jurisdiction (see{" "}
          <a href="/legal/excluded-jurisdictions">Excluded Jurisdictions</a>).
        </li>
        <li>
          You are not subject to any Sanction, and you are not listed on any
          sanctions or anti-money-laundering register.
        </li>
        <li>
          You will not use the Orderbook for, or in connection with, any
          unlawful activity.
        </li>
      </ol>

      <h2>7. No advice</h2>
      <p>
        We are not a financial, legal or tax adviser, and we are not a
        registered broker, dealer or analyst. Nothing made available through the
        Orderbook constitutes investment, financial, trading, legal, regulatory
        or tax advice. You are solely responsible for your own decisions and
        should consult a qualified professional where appropriate.
      </p>

      <h2>8. Indemnification</h2>
      <p>
        To the maximum extent permitted by applicable law, you agree to
        indemnify and hold harmless us, our affiliates and their respective
        officers, directors, agents and employees from any claim, demand or
        action, including reasonable legal fees, arising out of or relating to
        (a) your use of the Orderbook, (b) your breach of these terms, or (c)
        your violation of any law or the rights of any third party.
      </p>

      <h2>9. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by applicable law, we shall not be
        liable to you or any third party for any indirect, incidental,
        consequential, special, exemplary or punitive damages, or for any loss
        whatsoever arising out of or in connection with your use of the
        Orderbook. Because Test Tokens have no monetary value, no claim for loss
        of value in respect of Test Tokens can arise.
      </p>

      <h2>10. Release and waiver</h2>
      <p>
        To the maximum extent permitted by applicable law, you release and waive
        all claims against us and our affiliates, officers, agents, licensors
        and employees for any liability, damages, costs and expenses of every
        kind arising from or related to your use of the Orderbook. If we do not
        enforce our rights, or delay in doing so, that does not waive those
        rights.
      </p>

      <h2>11. Third parties</h2>
      <p>
        The Orderbook may integrate third-party services - including wallet
        extensions, RPC and indexing providers, bridges and analytics tools.
        Your use of those services may be governed by their own terms, over
        which we have no control, and we are not responsible for their conduct
        or their handling of data beyond the purposes described in our{" "}
        <a href="/legal/data-retention">Data Retention Policy</a>.
      </p>

      <h2>12. Restricted persons</h2>
      <p>
        These terms do not extend to any person or entity residing in, a citizen
        of, located in, or incorporated or registered in any jurisdiction listed
        on the{" "}
        <a href="/legal/excluded-jurisdictions">Excluded Jurisdictions</a> page.
        We make no exceptions. Use of a VPN or any other means to circumvent
        these restrictions is prohibited.
      </p>

      <h2>13. Changes to these terms</h2>
      <p>
        We may modify these terms from time to time. Changes take effect when
        posted on this page, and the &quot;last updated&quot; date above will
        change accordingly. Material changes will also be announced through our
        community channels.
      </p>
    </LegalLayout>
  );
}
