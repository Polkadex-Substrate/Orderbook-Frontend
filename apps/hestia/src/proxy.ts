/**
 * Next 16 renamed the `middleware` file convention to `proxy`.
 * (Was `src/middleware.ts` exporting `middleware`.)
 * Behaviour and matcher config are unchanged.
 */
import { defaultConfig } from "@orderbook/core/config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const { enableLmp: isRewardsActive, maintenanceMode } = defaultConfig;
  const isFaucetEnabled = process.env.NEXT_PUBLIC_ENABLE_FAUCET === "true";

  if (maintenanceMode) {
    return NextResponse.redirect(new URL("/maintenance", req.url));
  }
  if (!isRewardsActive && req.nextUrl.pathname.startsWith("/rewards")) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  if (!isFaucetEnabled && req.nextUrl.pathname.startsWith("/faucet")) {
    return NextResponse.redirect(new URL("/", req.url));
  }
}

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
