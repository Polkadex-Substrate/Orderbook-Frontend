"use client";

import { Typography } from "@mitrabook/ux";
import { RiWalletLine } from "@remixicon/react";

/**
 * The "nothing connected yet" state for a From/To account row.
 *
 * Why this is not a Button: the bridge screen previously showed four controls
 * that all read "Connect wallet" - one in the header (app-level Polkadex
 * account), one in From (EVM), one in To (Substrate), and the primary CTA.
 * Three different meanings, two of them duplicating the CTA, all with the same
 * label and similar weight. A first-time user cannot tell which one they need.
 *
 * The primary CTA already walks the flow one step at a time and performs each
 * step when clicked, so these rows do not need to be actions at all. They are
 * demoted to status plus a quiet text link: still reachable for anyone who
 * wants to connect out of order, but visually subordinate so there is exactly
 * one obvious thing to press.
 *
 * The label names the specific network rather than saying "wallet", because
 * the two rows need different wallet families (Ethereum vs Polkadot) and that
 * distinction is the thing users actually get wrong.
 */
export const PendingAccountRow = ({
  message,
  actionLabel,
  onAction,
}: {
  /** Status, e.g. "No Sepolia Testnet wallet connected". */
  message: string;
  /** Link text, e.g. "Connect". Omit to render status only. */
  actionLabel?: string;
  onAction?: () => void;
}) => (
  <div className="flex items-center gap-2">
    <RiWalletLine className="w-3.5 h-3.5 text-actionInput shrink-0" />
    <Typography.Text appearance="primary" size="xs">
      {message}
    </Typography.Text>
    {actionLabel && onAction && (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onAction();
        }}
        className="text-xs underline underline-offset-2 text-secondary hover:text-current transition-colors"
      >
        {actionLabel}
      </button>
    )}
  </div>
);
