import { NextRequest, NextResponse } from "next/server";

const INDEXER_URL =
  process.env.NEXT_PUBLIC_BRIDGE_INDEXER_URL ??
  "https://gargantua.indexer.polytope.technology";

// Proxy the Hyperbridge GraphQL indexer to avoid CORS when called from the browser.
// The browser POSTs to /api/hyperbridge (same origin); this handler forwards it
// to the real indexer from the Next.js server side where CORS doesn't apply.
export async function POST(request: NextRequest) {
  const body = await request.text();

  const upstream = await fetch(INDEXER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  const data = await upstream.text();
  return new NextResponse(data, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
