import { http, fallback, type Transport } from "viem";

/**
 * Build a viem transport from an RPC config value, with automatic failover.
 *
 * WHY THIS EXISTS
 * Every EVM read went through `http(rpcUrl)` against ONE hardcoded endpoint. When
 * that endpoint started refusing service - drpc returned
 *
 *   400 {"message":"chain is not available on free plan, ...","code":35}
 *
 * for every Sepolia call - bridging stopped entirely, because even the
 * preflight `isWeth()` read failed. A single provider is a single point of
 * failure for the whole bridge, and providers change their plans without
 * warning.
 *
 * `NEXT_PUBLIC_BRIDGE_SEPOLIA_RPC_URL` now accepts a COMMA-SEPARATED list.
 * viem's `fallback` transport tries them in order and moves on when one errors,
 * so losing a provider degrades instead of breaking.
 *
 * THE ORDER IS A COST POLICY, NOT JUST A PREFERENCE.
 * `fallback` treats the list as a strict priority order (ranking is off by
 * default), so entry 1 serves every request until it fails. Keyless public
 * endpoints therefore go first and metered/keyed ones last: the keyed endpoint
 * is billed only for the traffic the free ones could not absorb. Leading with a
 * keyed URL would meter every ordinary page view instead.
 *
 * Failover covers transport-level failures - 429, 5xx, timeouts, an endpoint
 * refusing the chain. It deliberately does NOT cover deterministic contract
 * errors: a revert or a user-rejected signature means the same thing at every
 * provider, and retrying those elsewhere would only slow down a real error.
 *
 * An empty value falls through to `http()` with no URL, which uses the chain's
 * own default public endpoint - a working last resort rather than a hard fail.
 */
export const parseRpcUrls = (raw: string | undefined): string[] =>
  (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * One retry, then hand over to the next endpoint.
 *
 * viem retries 3 times per transport by default with exponential backoff. With a
 * list of endpoints that is the wrong trade: when the free endpoint is rate
 * limited, three backed-off retries burn several seconds before failover, and
 * the user watches a spinner on a request another endpoint would have answered
 * immediately. Having somewhere else to go makes moving on better than retrying.
 */
const RETRY_COUNT = 1;

export const rpcTransport = (raw: string | undefined): Transport => {
  const urls = parseRpcUrls(raw);
  if (urls.length === 0) return http();
  // A single endpoint has nowhere to fail over to, so keep viem's retry default.
  if (urls.length === 1) return http(urls[0]);
  return fallback(urls.map((u) => http(u, { retryCount: RETRY_COUNT })));
};

/**
 * Turn an RPC provider failure into something a user can act on.
 *
 * viem's errors are excellent for developers and useless in a dialog: the raw
 * message is a multi-line dump of the request body, the contract address, the
 * function name, a docs link and a version string. A user who hit a rate limit
 * saw all of that and could not tell whether their funds were at risk.
 *
 * Returns null for anything unrecognised, so the caller keeps the original
 * message rather than replacing a specific error with a vague one.
 */
export const describeRpcError = (error: unknown): string | null => {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  if (!raw) return null;
  const s = raw.toLowerCase();

  // Rate limited. The public endpoints are shared and metered, and the chart
  // polls the datafeed on the same page, so this is the likeliest failure.
  // Note the absence of a bare "exceeded": it appears in "gas limit exceeded"
  // and "amount exceeded balance", and mislabelling either of those as a rate
  // limit would send the user off waiting a minute for no reason.
  if (
    s.includes("429") ||
    s.includes("too many requests") ||
    s.includes("rate limit") ||
    s.includes("rate-limit") ||
    s.includes("quota") ||
    s.includes("throttl")
  ) {
    return "The Sepolia network endpoint is busy (rate limit reached). Nothing was submitted - wait about a minute and try again.";
  }

  // Provider paywall. This is what actually broke bridging: drpc answered every
  // Sepolia call with 400 code 35, "chain is not available on free plan".
  if (
    s.includes("free plan") ||
    s.includes("upgrade to paid") ||
    s.includes("payment required") ||
    s.includes('"code":35')
  ) {
    return "The Sepolia network endpoint is refusing requests (provider plan limit). Nothing was submitted - please report this, it needs a config change.";
  }

  // Endpoint unreachable at all.
  if (
    s.includes("fetch failed") ||
    s.includes("failed to fetch") ||
    s.includes("networkerror") ||
    s.includes("timeout") ||
    s.includes("econnrefused")
  ) {
    return "Could not reach the Sepolia network. Nothing was submitted - check your connection and try again.";
  }

  return null;
};
