"use client";

import { useEffect, useState } from "react";

import {
  IS_TESTNET,
  TESTNET_ACK_EVENT,
  isTestnetAcknowledged,
} from "@/config/network";
import { shouldDisableResizeHandles } from "@/components/ui/testnetGate";

/**
 * Is a blocking consent gate currently covering the page?
 *
 * Used to switch off the trading layout's resize handles while the testnet
 * notice is up. See `shouldDisableResizeHandles` for why that is necessary: the
 * panel library intercepts pointer events at `<body>` in the capture phase and
 * cannot see a top-layer `<dialog>`, so it was eating the click on the notice's
 * own checkbox.
 *
 * STARTS FALSE ON PURPOSE. `isTestnetAcknowledged` reads sessionStorage, which
 * does not exist during the server pass; deriving the initial state from it
 * would make the server and the first client render disagree and produce a
 * hydration mismatch. The effect settles it immediately afterwards. Being wrong
 * for one render costs nothing here, because the notice is not on screen yet
 * either - it mounts on the same tick.
 */
export function useConsentGateOpen(): boolean {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let acknowledged = true;
    try {
      acknowledged = isTestnetAcknowledged();
    } catch {
      // Private-mode Safari throws on storage access. Treating that as
      // acknowledged leaves the handles enabled, which is the pre-existing
      // behaviour rather than a new failure.
      acknowledged = true;
    }
    setOpen(shouldDisableResizeHandles(IS_TESTNET, acknowledged));

    const onAck = () => setOpen(false);
    window.addEventListener(TESTNET_ACK_EVENT, onAck, { once: true });
    return () => window.removeEventListener(TESTNET_ACK_EVENT, onAck);
  }, []);

  return open;
}
