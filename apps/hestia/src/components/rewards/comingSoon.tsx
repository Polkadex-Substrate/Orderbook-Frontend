"use client";

import Link from "next/link";
import {
  RiStackLine,
  RiTimerFlashLine,
  RiPriceTag3Line,
  RiFlashlightLine,
  RiShieldCheckLine,
  RiArrowRightLine,
  RiHandCoinLine,
  RiCoinsLine,
  RiLineChartLine,
} from "@remixicon/react";

import { defaultConfig } from "@/config";

/**
 * The Rewards tab before the programme is live.
 *
 * ── WHAT THE PROGRAMME ACTUALLY DOES ──
 * Source: "LMP SOW v2 - Gap Analysis & Repo-Level Work Breakdown", 2026-05-06.
 * The score for each participant, per market, per round (E-14):
 *
 *     QFinal = (depth_score)^y x (uptime_count)^5 x (maker_volume)^z
 *
 *   - depth_score   how much size you keep resting on the book
 *   - uptime_count  one-minute samples you were present for. Raised to the
 *                   FIFTH power - consistency dominates. Being there beats
 *                   being big, and the copy has to say so.
 *   - maker_volume  volume from YOUR resting orders being filled. Taker volume
 *                   does not count. This is a market-making programme.
 *
 * Eligibility (C-07, C-08): orders only score inside the market's max spread
 * and above its minimum depth. Funding (C-04/C-06): a share of taker fees is
 * moved into the reward pool each round - so rewards come from real trading,
 * not from printing tokens. Also designed, not built: a 2x volatility
 * multiplier (C-18), a maker rebate on top-tier pairs (C-25), market tiers
 * (C-01), a wash-trade filter (E-06).
 *
 * NO HARD NUMBERS in the copy. The multiplier, rebate band and fee share are
 * governance-tunable and mostly unbuilt. NO DATES - standing policy.
 *
 * ── ON THE VISUAL DESIGN ──
 * Brand palette, from themeConfig: primary-base #E6007A (pink) and violet-base
 * #6745D2 are the brand pair, and the pink-to-violet gradient is the brand's
 * signature device - the theme file notes violet "was absent from the app
 * entirely, so the brand gradient could not be reproduced". This page uses it.
 *
 * positive-base #00E676 is reserved by the guidelines for growth and positive
 * metrics, explicitly NOT for primary actions - so it appears on the upside
 * panel and nowhere else here.
 *
 * Gradient text uses bg-clip-text, which needs a solid fallback colour for
 * browsers that drop it: the classes are ordered so text-textBase applies
 * first and is only overridden on success.
 */
export const ComingSoon = () => {
  const market = defaultConfig.landingPageMarket;

  return (
    <div className="flex-1 flex flex-col items-center px-4 pb-16">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div className="relative w-full max-w-5xl overflow-hidden rounded-b-3xl">
        {/* Two soft brand-coloured washes instead of a flat block. Kept at low
            opacity so text contrast stays well clear of the AA floor. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -left-24 h-72 w-72 rounded-full bg-primary-base/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-[#6745D2]/25 blur-3xl"
        />

        <div className="relative flex flex-col items-center gap-5 px-6 py-16 text-center md:py-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary-base/40 bg-primary-base/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary-base">
            <RiFlashlightLine className="h-3.5 w-3.5" />
            Coming soon
          </span>

          <h1 className="max-w-2xl text-4xl font-semibold leading-tight text-textBase md:text-5xl">
            Get paid to help{" "}
            <span className="bg-gradient-to-r from-primary-base to-[#6745D2] bg-clip-text text-transparent">
              others trade
            </span>
          </h1>

          <p className="max-w-xl text-base leading-relaxed text-primary">
            Soon you will earn rewards for leaving buy and sell offers on the
            market. Nothing is locked up, and you can cancel any offer at any
            time.
          </p>

          <Link
            href={`/trading/${market}`}
            className="group mt-2 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-base to-[#6745D2] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Start placing offers
            <RiArrowRightLine className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      <div className="flex w-full max-w-5xl flex-col gap-16 px-2 pt-4">
        {/* ── How you earn ──────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionTitle
            eyebrow="How it works"
            title="Four things that decide what you earn"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Card
              icon={<RiStackLine className="h-5 w-5" />}
              tint="pink"
              title="Leave offers on the market"
            >
              Place a buy or sell offer and let it sit. When someone trades
              against it, that counts. Offers you fill yourself do not.
            </Card>
            <Card
              icon={<RiTimerFlashLine className="h-5 w-5" />}
              tint="violet"
              title="Show up often"
              badge="Matters most"
            >
              This counts for more than anything else. Being there day after day
              beats placing one big offer once.
            </Card>
            <Card
              icon={<RiPriceTag3Line className="h-5 w-5" />}
              tint="info"
              title="Stay near the going price"
            >
              Your offer has to be close to the current price, and big enough to
              be useful. Offers parked far away do not earn.
            </Card>
            <Card
              icon={<RiFlashlightLine className="h-5 w-5" />}
              tint="attention"
              title="Earn more when it is busy"
            >
              A fast-moving market needs help the most, so rewards rise during
              those periods.
            </Card>
          </div>
        </section>

        {/* ── Where the rewards come from ───────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionTitle
            eyebrow="The pot"
            title="Funded by real trading, not printed tokens"
          />

          <div className="overflow-hidden rounded-2xl border border-primary bg-level-1">
            <div className="grid divide-y divide-primary md:grid-cols-3 md:divide-x md:divide-y-0">
              <Flow
                step="1"
                icon={<RiHandCoinLine className="h-5 w-5" />}
                title="People trade"
                body="The exchange collects a fee on trades, as any exchange does."
              />
              <Flow
                step="2"
                icon={<RiCoinsLine className="h-5 w-5" />}
                title="A share fills the pot"
                body="Part of those fees goes into a reward pot for each round."
              />
              <Flow
                step="3"
                icon={<RiLineChartLine className="h-5 w-5" />}
                title="You take your share"
                body="Split between everyone who helped, by how much each did."
              />
            </div>
            <div className="border-t border-primary bg-level-0 px-6 py-4">
              <p className="text-sm text-primary">
                Because the pot comes from trading, it grows as the exchange
                gets busier. No inflation, no token emission.
              </p>
            </div>
          </div>
        </section>

        {/* ── Why it is good for you ────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionTitle eyebrow="The upside" title="You gain twice over" />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-danger-base/30 bg-danger-base/5 p-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-danger-base">
                A thin market
              </p>
              <p className="text-sm leading-relaxed text-primary">
                Only a few offers waiting. A large order eats through them, and
                you end up paying more than the price you saw on screen.
              </p>
            </div>
            <div className="rounded-2xl border border-[#00E676]/30 bg-[#00E676]/5 p-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#00E676]">
                A deep market
              </p>
              <p className="text-sm leading-relaxed text-primary">
                Always someone on the other side. The price you see stays close
                to the price you get, and you can trade larger amounts without
                pushing the market against yourself.
              </p>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-primary">
            Rewards are how a market gets from the first to the second. You are
            paid for the part you play in it, and you benefit from everyone else
            playing theirs.
          </p>
        </section>

        {/* ── Fairness + what to do ─────────────────────────────────── */}
        <section className="grid gap-4 md:grid-cols-2">
          <div className="flex gap-4 rounded-2xl border border-primary bg-level-1 p-6">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#00E676]/10 text-[#00E676]">
              <RiShieldCheckLine className="h-5 w-5" />
            </span>
            <div className="flex flex-col gap-1">
              <h3 className="font-medium text-textBase">Kept fair</h3>
              <p className="text-sm leading-relaxed text-primary">
                Trading with yourself to inflate your score will not work. Those
                trades are filtered out, so the pot goes to people genuinely
                helping the market.
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-center gap-2 rounded-2xl border border-primary-base/30 bg-gradient-to-br from-primary-base/10 to-[#6745D2]/10 p-6">
            <h3 className="font-medium text-textBase">
              Nothing to do right now
            </h3>
            <p className="text-sm leading-relaxed text-primary">
              No sign-up, no waiting list. When it starts, this page shows what
              you have earned and lets you claim it. Getting used to placing
              offers now is the best preparation there is.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────── */

const TINTS = {
  pink: "bg-primary-base/10 text-primary-base",
  violet: "bg-[#6745D2]/15 text-[#8B72E8]",
  info: "bg-info-base/10 text-info-base",
  attention: "bg-attention-base/10 text-attention-base",
} as const;

const SectionTitle = ({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-xs font-semibold uppercase tracking-widest text-primary-base">
      {eyebrow}
    </span>
    <h2 className="text-2xl font-semibold text-textBase">{title}</h2>
  </div>
);

const Card = ({
  icon,
  tint,
  title,
  badge,
  children,
}: {
  icon: React.ReactNode;
  tint: keyof typeof TINTS;
  title: string;
  badge?: string;
  children: React.ReactNode;
}) => (
  <div className="group flex flex-col gap-3 rounded-2xl border border-primary bg-level-1 p-6 transition-colors hover:border-secondary-hover">
    <div className="flex items-center justify-between gap-3">
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${TINTS[tint]}`}
      >
        {icon}
      </span>
      {badge && (
        <span className="rounded-full bg-primary-base/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-base">
          {badge}
        </span>
      )}
    </div>
    <h3 className="font-medium text-textBase">{title}</h3>
    <p className="text-sm leading-relaxed text-primary">{children}</p>
  </div>
);

const Flow = ({
  step,
  icon,
  title,
  body,
}: {
  step: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) => (
  <div className="flex flex-col gap-3 p-6">
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-base/20 to-[#6745D2]/20 text-primary-base">
        {icon}
      </span>
      <span className="text-xs font-semibold text-secondary">Step {step}</span>
    </div>
    <h3 className="font-medium text-textBase">{title}</h3>
    <p className="text-sm leading-relaxed text-primary">{body}</p>
  </div>
);
