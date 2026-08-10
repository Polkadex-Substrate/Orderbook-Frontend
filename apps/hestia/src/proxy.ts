/**
 * Next 16 renamed the `middleware` file convention to `proxy`.
 * (Was `src/middleware.ts` exporting `middleware`.)
 * Behaviour and matcher config are unchanged.
 */
import { defaultConfig } from "@orderbook/core/config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const { maintenanceMode } = defaultConfig;
  const isFaucetEnabled = process.env.NEXT_PUBLIC_ENABLE_FAUCET === "true";

  if (maintenanceMode) {
    return NextResponse.redirect(new URL("/maintenance", req.url));
  }
  // /rewards is NO LONGER redirected when the programme is off.
  //
  // It used to bounce to "/" whenever `enableLmp` was false, which meant a
  // shared or bookmarked link silently dumped the user on the landing page with
  // no explanation - indistinguishable from a broken link. The page itself now
  // decides what to render: the live programme, or an explanation of what is
  // coming. See app/rewards/page.tsx.
  //
  // The sub-routes (/rewards/info, /rewards/[id]) are still matched below and
  // still reach their own components; only the redirect is gone.
  if (!isFaucetEnabled && req.nextUrl.pathname.startsWith("/faucet")) {
    return NextResponse.redirect(new URL("/", req.url));
  }
}

// NOTE ON WHAT IS *NOT* MATCHED: /faq and /legal/* are deliberately absent, so
// they stay reachable during maintenance mode. Legal pages have to be readable
// at all times, and help is most wanted when something is wrong. A user sent to
// /maintenance from /faq loses the only page that might answer them.
export const config = {
  matcher: [
    "/",
    "/rewards",
    "/rewards/:path*",
    "/trading",
    "/trading/:path*",
    "/transfer",
    "/transfer/:path*",
    "/history",
    "/balances",
    "/cexOnRamp",
    "/faucet",
    "/faucet/:path*",
  ],
};
