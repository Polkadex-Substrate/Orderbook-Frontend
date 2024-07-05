import { defaultConfig } from "@orderbook/core/config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
export function middleware(req: NextRequest) {
  const {
    enableLmp: isRewardsActive,
    isBridgeEnabled,
    maintenanceMode,
  } = defaultConfig;

  const isTransferPage = req.nextUrl.pathname.startsWith("/transfer");

  if (maintenanceMode) {
    return NextResponse.redirect(new URL("/maintenance", req.url));
  }
  if (!isRewardsActive && req.nextUrl.pathname.startsWith("/rewards")) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  if (!isBridgeEnabled && req.nextUrl.pathname.startsWith("/thea")) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  if (isTransferPage) {
    const nextUrl = req.nextUrl;
    if (nextUrl.searchParams.get("type") !== "transfer") {
      nextUrl.searchParams.set("type", "transfer");
      return NextResponse.redirect(nextUrl);
    }
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
    "/thea",
  ],
};
