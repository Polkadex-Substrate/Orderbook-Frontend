"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useNativeApi } from "@orderbook/core/providers/public/nativeApi";
import { apiConnectionStatus } from "@orderbook/core/helpers";

/**
 * Tell the user when the chain is unreachable, somewhere they will actually see.
 *
 * WHY THE FOOTER WAS NOT ENOUGH
 * Fixing the footer's label fixed a false statement, but only for people who can
 * see the footer. `Footer` is `fixed bottom-0` only when `!mobileView`, so on a
 * phone it sits in normal flow at the end of the document and a user on /trading
 * never scrolls to it. The Sentry occurrences of
 *
 *   FATAL: Unable to initialize the API: No response received from RPC endpoint in 60s
 *
 * are ALL iOS, which is exactly the population the footer cannot reach. Shipping
 * only the footer change would have fixed the half of the bug that was not being
 * reported.
 *
 * WHY A TOAST, AND WHY A PERSISTENT ONE
 * A toast is the one surface already mounted above every route at every width.
 * But the condition is persistent, and a notice that fades after four seconds
 * while the app stays broken is its own small lie, so this one has no duration
 * and is dismissed programmatically when the connection returns. The fixed `id`
 * means repeated renders update the same toast instead of stacking.
 *
 * WHY IT DOES NOT FLAP
 * `unavailable` is reached only through `nativeApiConnectError()`, which fires
 * on a genuine bootstrap failure. `onDisconnected` deliberately only logs,
 * because WsProvider auto-reconnects on RECONNECT_TIME_MS and tearing down a
 * session over a blip is worse than the blip. `nativeApiDisconnectData()` exists
 * but is never dispatched. So this cannot fire on a transient reconnect.
 *
 * The copy says what is wrong and what the user can do, and claims nothing about
 * the cause: from the browser, an unreachable RPC and a dead local network are
 * indistinguishable, so blaming either would be a guess shown to a user.
 */
export const ApiConnectionNotice = () => {
  const { connected, connecting } = useNativeApi();
  const status = apiConnectionStatus({ connected, connecting });

  useEffect(() => {
    const id = "api-connection-unavailable";

    if (status === "unavailable") {
      toast.error("Cannot reach the Polkadex network", {
        id,
        duration: Infinity,
        description:
          "Prices and balances may be out of date and orders will not go through. Retrying automatically - check your connection, or reload the page.",
      });
      return;
    }

    // Covers "connected" and also "connecting", so a recovery clears the notice
    // the moment the socket comes back rather than waiting for a full handshake.
    toast.dismiss(id);
  }, [status]);

  return null;
};
