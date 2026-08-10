"use client";

import Link from "next/link";
import { PropsWithChildren } from "react";
import {
  RiRocket2Line,
  RiKey2Line,
  RiWalletLine,
  RiExchangeLine,
  RiSwap3Line,
  RiDropLine,
  RiLifebuoyLine,
  RiAddLine,
  RiArrowLeftLine,
  RiAlertLine,
} from "@remixicon/react";

import { Footer, Header } from "@/components/ui";
import { defaultConfig } from "@/config";
import { EXTERNAL_LINKS } from "@/config/links";

/**
 * The FAQ.
 *
 * WHY IT IS A PAGE AND NOT A LINK
 * The Help menu pointed at https://docs.polkadex.ee/orderbookPolkadexFAQWallets,
 * which is dead. A broken FAQ link is worse than no FAQ: someone with a real
 * problem clicks it, gets nothing, and concludes the product is unmaintained.
 * Serving it from the app means it ships with the code that causes the
 * questions and can be corrected in the same commit as a fix.
 *
 * WHERE THE CONTENT COMES FROM
 * Every entry is a real reported incident from testing, not FAQ filler:
 *   balances differing between screens -> spendable vs in-orders vs funding
 *   "my order vanished"                -> instant fills left no trace
 *   "not in the book yet"              -> dropped increments, now resynced
 *   "which currency is the bridge fee" -> gas on the SOURCE chain
 *   portfolio showing no value          -> no price source on testnet
 *   cannot sign from this browser       -> the trading key is per-browser
 *
 * The answers reuse the wording the UI actually shows, so someone searching for
 * the sentence on their screen lands on the right entry. If either changes,
 * change both.
 *
 * ACCORDIONS ARE NATIVE <details>. No state, no JS, no hydration cost, and
 * keyboard plus screen-reader behaviour comes free and correct. Browser find-in-page
 * also opens closed sections in current browsers, which a div-based accordion
 * breaks - and find-in-page is how people actually use an FAQ.
 */
export function Faq() {
  return (
    <div className="flex flex-1 flex-col bg-backgroundBase min-h-screen">
      <Header />

      <main className="flex-1 w-full pb-20">
        {/* ── Hero ───────────────────────────────────────────────── */}
        <div className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-28 left-1/4 h-64 w-64 rounded-full bg-primary-base/20 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-20 right-1/4 h-64 w-64 rounded-full bg-[#6745D2]/20 blur-3xl"
          />

          <div className="relative mx-auto w-full max-w-3xl px-5 pt-10 pb-12">
            <Link
              href={`/trading/${defaultConfig.landingPageMarket}`}
              className="mb-8 inline-flex items-center gap-1.5 text-sm text-primary transition-colors hover:text-textBase"
            >
              <RiArrowLeftLine className="h-4 w-4" />
              Back to the exchange
            </Link>

            <h1 className="text-4xl font-semibold leading-tight text-textBase md:text-5xl">
              Questions,{" "}
              <span className="bg-gradient-to-r from-primary-base to-[#6745D2] bg-clip-text text-transparent">
                answered
              </span>
            </h1>

            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-attention-base/30 bg-attention-base/5 p-4">
              <RiAlertLine className="mt-0.5 h-5 w-5 shrink-0 text-attention-base" />
              <p className="text-sm leading-relaxed text-primary">
                This is a <strong className="text-textBase">testnet</strong>.
                Nothing here uses real money, and every balance is a test token
                with no value.
              </p>
            </div>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-5">
          <Group
            icon={<RiRocket2Line className="h-5 w-5" />}
            tint="pink"
            title="Getting started"
          >
            <Q q="What is this?">
              <p>
                A non-custodial exchange. Your funds stay in your own wallet
                under your own keys, so there is no account with us holding your
                money.
              </p>
            </Q>
            <Q q="What do I need before I can trade?">
              <ol>
                <li>A supported browser wallet, connected to this site.</li>
                <li>
                  A <strong>trading account</strong>, created once. See the next
                  section - this is the part that confuses most people.
                </li>
                <li>
                  Test tokens, free from the <Link href="/faucet">Faucet</Link>.
                </li>
                <li>
                  A little PDEX, which pays the network fee for on-chain
                  actions.
                </li>
              </ol>
            </Q>
          </Group>

          <Group
            icon={<RiKey2Line className="h-5 w-5" />}
            tint="violet"
            title="Accounts and keys"
          >
            <Q q="Why are there two accounts?">
              <p>
                Your <strong>funding account</strong> is your normal wallet. It
                holds your tokens and signs the occasional important things:
                deposits, withdrawals, registering a trading account.
              </p>
              <p>
                Your <strong>trading account</strong> is a separate key that
                only signs orders, so you are not approving a wallet popup for
                every order. It cannot withdraw your funds - that is the point.
                If it were ever misused, the damage stops at placing and
                cancelling orders.
              </p>
            </Q>
            <Q q="Why does it say my trading account key is not in this browser?">
              <p>
                Because that is literally the case. Registering a trading
                account is recorded on the blockchain, but{" "}
                <strong>
                  the key itself is stored only in the browser that created it
                </strong>
                . Any device can see the account exists; only the original
                browser can sign with it.
              </p>
              <p>You will see this after:</p>
              <ul>
                <li>switching browser, device or profile</li>
                <li>clearing site data</li>
                <li>using a private or incognito window</li>
              </ul>
              <p>
                Accounts you cannot sign with are greyed out rather than hidden,
                so you can tell &quot;does not exist&quot; from &quot;not usable
                here&quot;. To trade on a new browser, import the trading
                account&apos;s mnemonic or register a new one.
              </p>
            </Q>
            <Q q="Can I lose access permanently?">
              <p>
                <strong>Yes.</strong> Clear your browser data without having
                saved the trading account&apos;s mnemonic and that key is gone -
                we cannot recover it and neither can anyone else.
              </p>
              <p>
                Your funds are not lost: they belong to your funding account and
                you can register a new trading account. But open orders from the
                old one can only be cancelled from a browser that still holds
                its key. Save the mnemonic when it is offered. It is offered
                once.
              </p>
            </Q>
          </Group>

          <Group
            icon={<RiWalletLine className="h-5 w-5" />}
            tint="info"
            title="Balances"
          >
            <Q q="Why does my balance look different on different screens?">
              <p>
                Your tokens can be in three states at once, and each screen
                cares about different ones:
              </p>
              <ul>
                <li>
                  <strong>Funding</strong> - in your wallet, not yet on the
                  exchange.
                </li>
                <li>
                  <strong>Tradable</strong> - on the exchange, free to use now.
                </li>
                <li>
                  <strong>In orders</strong> - reserved by your own open orders.
                  Cancel one to release it.
                </li>
              </ul>
            </Q>
            <Q q="What does Spendable mean on the order form?">
              <p>
                The most you can put into this order: tradable plus funding.
                Funding counts because the form moves it for you when you
                submit.
              </p>
              <p>
                It excludes anything held in open orders, because that money is
                not available until you cancel something. If Spendable looks
                lower than your total, that is the difference - the line beneath
                shows the breakdown.
              </p>
            </Q>
            <Q q="Why does my portfolio show a count of assets instead of a value?">
              <p>
                Testnet has no price feed, so there is no honest way to convert
                test tokens into a currency total. Rather than print a confident
                $0.00 - indistinguishable from a working valuation reporting bad
                news - it shows how many assets you hold and points you at the
                table, where the amounts are exact.
              </p>
            </Q>
          </Group>

          <Group
            icon={<RiExchangeLine className="h-5 w-5" />}
            tint="pink"
            title="Placing orders"
          >
            <Q q="I placed an order and it disappeared. Where did it go?">
              <p>
                It almost certainly filled immediately. An order that fills the
                moment you place it never rests in Open Orders, so there is
                nothing to show there. Check{" "}
                <Link href="/history">History</Link> - a completed trade will be
                listed, and you should have seen a notification confirming it.
              </p>
            </Q>
            <Q q="My order is not showing in the order book yet.">
              <p>
                Give it a moment. The book arrives as a live stream, and if the
                app detects it missed an update it refetches the whole book
                rather than show you something stale. Still missing after a few
                seconds? Reload the page.
              </p>
            </Q>
            <Q q="The total box turned red and I do not know why.">
              <p>
                The order is larger than your spendable balance, or below the
                market&apos;s minimum size. The reason is written directly
                beneath the field. A red box with <em>no</em> message is a bug
                worth reporting.
              </p>
            </Q>
            <Q q="Do I need PDEX to trade?">
              <p>
                A small amount. PDEX pays the network fee for on-chain actions -
                registering a trading account, depositing, withdrawing. Placing
                and cancelling orders costs no PDEX. The faucet provides some.
              </p>
            </Q>
          </Group>

          <Group
            icon={<RiSwap3Line className="h-5 w-5" />}
            tint="attention"
            title="Bridging"
          >
            <Q q="What fee do I pay to bridge, and in what?">
              <p>
                The <strong>network gas fee on the chain you send from</strong>,
                paid in that chain&apos;s native token, from the wallet you are
                sending with. Bridging from Sepolia means Sepolia ETH.
              </p>
              <p>
                It is <strong>not</strong> taken from the asset you are
                bridging. Sending USDC does not mean the fee comes out of your
                USDC - you need a little ETH in the same wallet too. The
                confirmation dialog names the currency and the wallet before you
                sign.
              </p>
            </Q>
            <Q q="How long does a transfer take?">
              <p>
                Usually a few minutes, longer when the source chain is busy. It
                is tracked, so you can close the tab and come back.
              </p>
            </Q>
            <Q q="My deposit failed with an error about numbers or an underflow.">
              <p>
                A known problem affecting some bridged assets on testnet, caused
                by a mismatch in how many decimal places each side expects. You
                cannot fix it from your side and your funds are not lost. Please
                report it with the asset and amount so we can confirm which
                pairs are affected.
              </p>
            </Q>
          </Group>

          <Group
            icon={<RiDropLine className="h-5 w-5" />}
            tint="info"
            title="Faucet"
          >
            <Q q="How do I get test tokens?">
              <p>
                Open the <Link href="/faucet">Faucet</Link>, connect your
                wallet, and request what you need. Each address can request each
                token once per day.
              </p>
            </Q>
            <Q q="The faucet says I have reached my limit.">
              <p>
                Limits reset daily. If you need more than the daily amount for
                testing, ask on Discord rather than creating extra addresses -
                it makes the test data much harder for us to read.
              </p>
            </Q>
          </Group>

          <Group
            icon={<RiLifebuoyLine className="h-5 w-5" />}
            tint="violet"
            title="Reporting a problem"
          >
            <Q q="Something looks wrong. What is the most useful thing I can do?">
              <p>
                Use the feedback button on the page - it attaches what you were
                looking at, which saves a great deal of guessing. Otherwise
                reach us on{" "}
                <a
                  href={EXTERNAL_LINKS.discord}
                  target="_blank"
                  rel="noreferrer"
                >
                  Discord
                </a>
                .
              </p>
              <p>What helps most, in order:</p>
              <ol>
                <li>What you expected, and what happened instead.</li>
                <li>The market, and roughly the time.</li>
                <li>A screenshot, including any error text.</li>
                <li>Your browser, and wallet extension or mobile.</li>
              </ol>
            </Q>
          </Group>

          <div className="rounded-2xl border border-primary-base/30 bg-gradient-to-br from-primary-base/10 to-[#6745D2]/10 p-6">
            <h2 className="font-medium text-textBase">Not answered here?</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-primary">
              Ask on{" "}
              <a
                href={EXTERNAL_LINKS.discord}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                Discord
              </a>
              . Several answers on this page exist because someone took the time
              to describe what confused them.
            </p>
          </div>
        </div>
      </main>

      <Footer fixedPosition={false} />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────── */

const TINTS = {
  pink: "bg-primary-base/10 text-primary-base",
  violet: "bg-[#6745D2]/15 text-[#8B72E8]",
  info: "bg-info-base/10 text-info-base",
  attention: "bg-attention-base/10 text-attention-base",
} as const;

const Group = ({
  icon,
  tint,
  title,
  children,
}: PropsWithChildren<{
  icon: React.ReactNode;
  tint: keyof typeof TINTS;
  title: string;
}>) => (
  <section className="flex flex-col gap-3">
    <div className="flex items-center gap-3">
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-xl ${TINTS[tint]}`}
      >
        {icon}
      </span>
      <h2 className="text-lg font-semibold text-textBase">{title}</h2>
    </div>
    <div className="flex flex-col gap-2">{children}</div>
  </section>
);

const Q = ({ q, children }: PropsWithChildren<{ q: string }>) => (
  <details className="group rounded-xl border border-primary bg-level-1 transition-colors open:bg-level-2 hover:border-secondary-hover">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-medium text-textBase [&::-webkit-details-marker]:hidden">
      {q}
      <RiAddLine className="h-4 w-4 shrink-0 text-primary transition-transform group-open:rotate-45" />
    </summary>
    <div
      className={[
        "flex flex-col gap-3 px-5 pb-5 text-sm leading-relaxed text-primary",
        "[&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5 [&_ul]:pl-5 [&_ul]:list-disc",
        "[&_ol]:flex [&_ol]:flex-col [&_ol]:gap-1.5 [&_ol]:pl-5 [&_ol]:list-decimal",
        "[&_strong]:text-textBase [&_strong]:font-medium",
        "[&_a]:text-primary-base [&_a]:underline [&_a]:underline-offset-2",
      ].join(" ")}
    >
      {children}
    </div>
  </details>
);
