import { redirect } from "next/navigation";

import { defaultConfig } from "@/config";

/**
 * Testnet: skip the marketing landing and go straight to the orderbook.
 * The landing page still exists at /welcome (for mainnet, move it back
 * here). Temporary redirect (307) on purpose — a permanentRedirect would
 * be cached by browsers and make restoring the landing painful.
 */
export default function Page() {
  redirect(`/trading/${defaultConfig.landingPageMarket}`);
}
