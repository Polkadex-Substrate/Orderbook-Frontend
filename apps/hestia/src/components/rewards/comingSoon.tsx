"use client";

/**
 * The Rewards tab before the programme is live.
 *
 * ── WHAT THE PROGRAMME ACTUALLY DOES ──
 * Source: "LMP SOW v2 - Gap Analysis & Repo-Level Work Breakdown", 2026-05-06.
 * The score for each participant, per market, per round (E-14):
 *
 *     QFinal = (depth_score)^y x (uptime_count)^5 x (maker_volume)^z
 *
 * Read that carefully before editing this copy:
 *   - depth_score   how much size you keep resting on the book
 *   - uptime_count  how many one-minute samples you were present for.
 *                   Raised to the FIFTH power - consistency dominates
 *                   everything else. Being there beats being big.
 *   - maker_volume  volume from YOUR resting orders being filled. Taker
 *                   volume does not count. This is a market-making programme.
 *
 * Eligibility filters (C-07, C-08): orders only score if they are inside the
 * market's max spread and above its minimum depth. So "close to the price and
 * big enough to matter" is a real rule, not marketing.
 *
 * Funding (C-04/C-06): a share of taker fees collected each round is moved into
 * the reward pool. Rewards come from real trading activity, not from printing
 * tokens - worth saying, because traders assume the opposite.
 *
 * Also designed, not yet built: a 2x multiplier when a market turns volatile
 * (C-18, E-03/E-04), a per-fill maker rebate on top-tier pairs (C-25), market
 * tiers 1/2/3 (C-01), and a wash-trade filter that excludes self-matched volume
 * (E-06).
 *
 * ── DELIBERATELY NOT IN THE COPY ──
 * No hard numbers. The multiplier, the rebate band and the fee share are all
 * governance-tunable and several are still 0% built. Publishing a number we
 * then change is worse than publishing none. Add them when they are fixed.
 *
 * A previous version of this file dropped the resting-order explanation because
 * the frontend's LMP hooks only exposed volume and fees. Those hooks are v1
 * remnants; the SOW lists orderbook-fe as 0/19 items for v2. Checking the old
 * client was the wrong evidence for what the programme rewards.
 *
 * ── RULES FOR THIS COPY ──
 * 1. No internal vocabulary: no "LMP", no "liquidity mining", no "Q-score",
 *    no "epoch", no "maker/taker", no "spread", no "depth".
 * 2. No dates. Standing policy. Nearly every work package is unstarted.
 * 3. Short words, short sentences.
 */
export const ComingSoon = () => {
  return (
    <div className="flex-1 flex flex-col items-center px-4 py-10 md:py-16">
      <div className="max-w-2xl w-full flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <span className="text-primary text-sm font-medium uppercase tracking-wide">
            Coming soon
          </span>
          <h1 className="text-3xl md:text-4xl font-semibold text-textBase">
            Get paid to help others trade
          </h1>
          <p className="text-textSecondary leading-relaxed">
            Soon you will earn rewards for leaving buy and sell offers on the
            market. You keep full control of your funds. Nothing is locked up,
            and you can cancel any offer at any time.
          </p>
        </div>

        <div className="flex flex-col gap-5 border-t border-primary pt-8">
          <h2 className="text-lg font-semibold text-textBase">How you earn</h2>
          <div className="flex flex-col gap-4">
            <Item title="Leave offers on the market">
              Place a buy or sell offer and let it sit. When someone trades
              against it, that counts towards your rewards. Offers you fill
              yourself do not count.
            </Item>
            <Item title="Show up often">
              This matters most of all. Being there day after day counts for far
              more than placing one big offer once.
            </Item>
            <Item title="Stay close to the going price">
              Your offer has to be near the current price, and big enough to be
              useful to someone. Offers parked far away do not earn.
            </Item>
            <Item title="Earn more when things get busy">
              When a market moves fast it needs help the most, so rewards go up
              during those periods.
            </Item>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-primary pt-8">
          <h2 className="text-lg font-semibold text-textBase">
            Where the rewards come from
          </h2>
          <p className="text-textSecondary leading-relaxed">
            A share of the trading fees the exchange collects goes into a reward
            pot each round. It is split between everyone who helped, based on
            how much each person did.
          </p>
          <p className="text-textSecondary leading-relaxed">
            So the rewards are paid for by real trading. The busier the exchange
            gets, the bigger the pot.
          </p>
        </div>

        <div className="flex flex-col gap-3 border-t border-primary pt-8">
          <h2 className="text-lg font-semibold text-textBase">
            Why this is good for you
          </h2>
          <p className="text-textSecondary leading-relaxed">
            A market works best when there are plenty of offers waiting on both
            sides. When there are only a few, a large order eats through them
            and you end up paying more than the price you saw on screen.
          </p>
          <p className="text-textSecondary leading-relaxed">
            This is how we fix that. Paying people to keep real offers up means
            there is always someone on the other side. The price you see stays
            closer to the price you get, and you can trade larger amounts
            without pushing the market against yourself.
          </p>
          <p className="text-textSecondary leading-relaxed">
            You can gain twice over: once from the rewards you earn, and again
            from better prices as more people join in.
          </p>
        </div>

        <div className="flex flex-col gap-3 border-t border-primary pt-8">
          <h2 className="text-lg font-semibold text-textBase">Kept fair</h2>
          <p className="text-textSecondary leading-relaxed">
            Trading with yourself to inflate your score will not work. Those
            trades are filtered out, so the pot goes to people genuinely helping
            the market.
          </p>
        </div>

        <div className="flex flex-col gap-3 border-t border-primary pt-8">
          <h2 className="text-lg font-semibold text-textBase">
            What to do now
          </h2>
          <p className="text-textSecondary leading-relaxed">
            Nothing. There is no sign-up and no waiting list. When it starts,
            this page will show what you have earned and let you claim it.
            Getting used to placing offers now is the best preparation there is.
          </p>
        </div>
      </div>
    </div>
  );
};

const Item = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-1">
    <h3 className="text-textBase font-medium">{title}</h3>
    <p className="text-textSecondary text-sm leading-relaxed">{children}</p>
  </div>
);
