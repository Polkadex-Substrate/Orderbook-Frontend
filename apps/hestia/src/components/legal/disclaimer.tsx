"use client";

import { LegalLayout } from "./layout";

/**
 * Disclaimer and Legal Notice - testnet edition.
 *
 * Adapted from Polkadex_Disclaimer_and_Legal_Notice.pdf. The original's risk
 * sections (volatility, liquidity, availability, third parties) are retained
 * because they describe the software's behaviour, not just market risk; the
 * testnet-specific sections (no value, resets, faucet) are new.
 */
export function Disclaimer() {
  return (
    <LegalLayout
      title="Disclaimer and Legal Notice"
      updated="25 July 2026"
      intro="This notice describes the risks of using the Orderbook TESTNET. The most important one: nothing here has monetary value, and the network may be reset at any time."
    >
      <h2>Introduction</h2>
      <p>
        This notice describes risks associated with the Orderbook testnet. It
        does not explain every risk, nor how these risks relate to your personal
        circumstances. Terms defined in the{" "}
        <a href="/legal/terms">Terms of Use</a> have the same meaning here.
      </p>

      <h2>Testnet: no value, no guarantees</h2>
      <ul>
        <li>
          Tokens on this network are{" "}
          <strong>test assets with no monetary value</strong>. They are
          distributed free of charge and cannot be exchanged for money, mainnet
          assets, or anything else of value.
        </li>
        <li>
          The network, including all balances, orders and history,{" "}
          <strong>may be reset or rolled back at any time</strong> without
          notice or compensation.
        </li>
        <li>
          Features may be incomplete, defective or removed without warning.
          Testnet behaviour is not a representation of how any future production
          system will behave.
        </li>
        <li>
          <strong>Do not send real funds or mainnet assets</strong> to addresses
          on this network. Such transfers cannot be reversed or recovered.
        </li>
      </ul>

      <h2>Use of the platform</h2>
      <p>
        You may use the Orderbook only if you comply with the Terms of Use and
        with the laws applicable in your jurisdiction. We are not liable for
        damages resulting from your unlawful use of the platform.
      </p>
      <p>
        We have no control over your assets. We provide software you can use to
        transact; custody remains with you at all times.
      </p>
      <p>
        You may not use the Orderbook if you are connected with any jurisdiction
        listed on the{" "}
        <a href="/legal/excluded-jurisdictions">Excluded Jurisdictions</a> page,
        which reflects the current lists published by the Financial Action Task
        Force.
      </p>

      <h2>Legal</h2>
      <p>
        Every user must abide by local law. You acknowledge and declare that
        your funds originate from legitimate sources and not from illegal
        activity.
      </p>
      <p>
        Changes in legislation, and the opinions of supervisory authorities, may
        materially affect digital assets. This risk is unpredictable and varies
        between markets. It is your responsibility to familiarise yourself with
        the laws and regulations applicable to you.
      </p>

      <h2>No personal advice</h2>
      <p>
        We do not provide personal advice in relation to any product or service.
        No communication or information provided to you is intended as, or
        should be construed as, investment, financial, trading, tax, regulatory
        or legal advice. You are solely responsible for determining whether any
        transaction is appropriate for you.
      </p>
      <p>
        We do not act as a broker, intermediary, agent or adviser, and have no
        fiduciary relationship or obligation to you. We do not monitor whether
        your use of the Orderbook is consistent with your goals or
        circumstances.
      </p>

      <h2>Software and smart contract risk</h2>
      <p>
        The Orderbook is experimental software operating against an evolving
        blockchain runtime. It may contain defects. Bugs in the interface, the
        runtime, or in bridged asset handling can cause transactions to fail, to
        settle unexpectedly, or to become stuck. On a testnet these outcomes are
        expected and are part of what testing is for.
      </p>

      <h2>Volatility and liquidity</h2>
      <p>
        Markets on this network are thin and prices are arbitrary; they do not
        reflect any real market. Digital assets generally are subject to high
        market risk and price volatility, and may have limited liquidity, making
        it difficult or impossible to exit a position when you wish to.
      </p>

      <h2>Availability</h2>
      <p>
        We do not guarantee that the Orderbook will be available at any
        particular time. Operation is subject to errors, unplanned outages,
        network congestion, chain halts and scheduled resets. It may not be
        possible to trade, transfer, deposit or withdraw when you wish to.
      </p>

      <h2>Third-party risk</h2>
      <p>
        Third parties - including wallet providers, RPC and indexing services,
        and bridge operators - may be involved in delivering functionality. You
        may be subject to their terms, over which we have no control, and their
        failures may affect your use of the Orderbook.
      </p>
    </LegalLayout>
  );
}
