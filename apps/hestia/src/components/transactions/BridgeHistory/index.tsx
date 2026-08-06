"use client";

/**
 * Cross Chain history - interim signpost, not a table.
 *
 * WHY THERE IS NO TABLE HERE
 * This tab used to list Thea bridge transfers. Thea is obsolete and its code is
 * gone - the table, its columns, filters, export and card sub-components, and the
 * useTheaTransactions hook were all deleted rather than left commented out. Git
 * history has them if the shape is ever wanted; a dead implementation sitting in
 * the tree just makes every future reader work out whether it is live.
 *
 * A real history cannot be built from the frontend alone. The Hyperbridge SDK's
 * query client is addressed by COMMITMENT - the hash a transfer produces when you
 * submit it - not by account. So this app can only identify transfers it started
 * itself, in this browser. A complete, cross-device history needs the transfers
 * indexed server-side and queryable by address, which is backend work.
 *
 * WHY THIS IS NOT "COMING SOON"
 * It said that before, which is worse than useless: a user who just bridged is
 * looking for their money, and a dead end reads like the transfer was lost. The
 * transfer IS observable, just not in one place, so the honest thing is to say
 * where. Both legs are listed below rather than leaving the user to guess.
 *
 * Replacing this with a real table is the whole job - so when that happens, this
 * component goes away rather than growing.
 */

import { forwardRef } from "react";
import { GenericMessage, Button, Typography } from "@mitrabook/ux";
import Link from "next/link";

// NO OUTBOUND HYPERBRIDGE LINK HERE, DELIBERATELY.
//
// This panel briefly linked to NEXT_PUBLIC_HYPERBRIDGE_URL, which is set to
// app-staging.hyperbridge.network - a domain that no longer resolves
// (DNS_PROBE_FINISHED_NXDOMAIN). app.hyperbridge.network does resolve but appears
// to be mainnet, and no testnet UI could be confirmed. Sending a user hunting for
// a transfer to a dead or wrong-network page is worse than not offering the link,
// so the panel only points at destinations inside this app.
//
// Restore a button here once a testnet URL is verified. Note the same env var is
// the iframe src in bridge/HyperbridgeEmbed.tsx, so that embed is pointed at the
// dead host too - fix them together.

export const BridgeHistory = forwardRef<
  HTMLDivElement,
  { maxHeight?: string; searchTerm: string }
>((_props, ref) => (
  <div ref={ref} className="flex items-center justify-center py-16 px-4">
    <GenericMessage
      title="Cross-chain transfers aren't listed here yet"
      illustration="NoResultFound"
      className="bg-level-0 border-y border-y-primary"
      imageProps={{ className: "w-10 self-center" }}
    >
      <div className="flex flex-col gap-3 max-w-[420px]">
        <Typography.Text appearance="primary" size="sm">
          A cross-chain transfer has two legs, and each one is visible today:
        </Typography.Text>
        <Typography.Text appearance="primary" size="sm">
          <span className="font-semibold">On Polkadex</span> - funds arriving in
          or leaving your Funding account show up under Transfer. Withdrawals
          waiting on you appear there as Ready to Claim.
        </Typography.Text>
        <Typography.Text appearance="primary" size="sm">
          <span className="font-semibold">On the other network</span> - the
          transfer is settled by Hyperbridge and shows up in your wallet or a
          block explorer for that chain. Delivery usually takes 10-15 minutes.
        </Typography.Text>
        <div className="flex gap-2 flex-wrap justify-center pt-1">
          <Button.Solid asChild size="sm">
            <Link href="/history?tab=transfer">View Transfer history</Link>
          </Button.Solid>
          <Button.Solid asChild size="sm" appearance="secondary">
            <Link href="/transfer">Ready to Claim</Link>
          </Button.Solid>
        </div>
      </div>
    </GenericMessage>
  </div>
));

BridgeHistory.displayName = "BridgeHistory";
