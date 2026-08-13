/**
 * The origin this app is actually being served from, for WalletConnect/Reown
 * metadata.
 *
 * THE BUG THIS FIXES (ORDERBOOK-TESTNET-2, recurring since 2026-08-10)
 *
 *   Error: The source https://testnet.polkadex.ee/ has not been authorized yet
 *
 * Reown verifies the origin a session request comes from against the allowlist
 * configured for the project id. `config/wagmi.ts` told it:
 *
 *   url: process.env.NEXT_PUBLIC_APP_URL ?? "<hardcoded mainnet url>"
 *
 * That fallback is a footgun, twice over.
 *
 * First, NEXT_PUBLIC_ variables are inlined at BUILD time, so if the Docker
 * build does not pass NEXT_PUBLIC_APP_URL, the testnet bundle silently declares
 * itself to be a different origin. Reown then rejects it, and the failure reads
 * like a dashboard misconfiguration rather than a missing build arg.
 *
 * Second, and worse: the hardcoded value was on the `polkadex.trade` domain,
 * which the company NO LONGER OWNS as of August 2026. A shipped bundle naming a
 * domain you do not control is a hazard, not just a wrong URL - whoever
 * registers it inherits whatever that reference is trusted for. The lesson is
 * that a hardcoded product URL in a fallback is a liability with a shelf life;
 * this module has none, by design.
 *
 * THE FIX: in the browser, ask the browser. `window.location.origin` is the
 * origin Reown will actually see, so it cannot disagree with itself. The env var
 * is used only for server rendering, where there is no window, and a mismatch
 * between the two is reported rather than ignored.
 *
 * Note the trailing slash in the Sentry message. Reown normalises the origin, so
 * the allowlist entry must match the scheme-and-host form - a bare hostname
 * entry will not match. That part is dashboard configuration and cannot be fixed
 * from here; this module removes the code-side half of the problem.
 *
 * Import-free so it is testable without a browser or a bundler.
 */

/** Used only if nothing better is available, and never silently. */
export const ORIGIN_UNKNOWN = "";

/**
 * Resolve the app origin.
 *
 * @param windowOrigin `window.location.origin` when running in a browser.
 * @param envUrl       `NEXT_PUBLIC_APP_URL`, for the server-render pass.
 *
 * Returns a scheme-and-host origin with no trailing slash and no path, which is
 * the form Reown compares against.
 */
export const resolveAppOrigin = (
  windowOrigin?: string | null,
  envUrl?: string | null
): string => {
  // The browser's own answer wins. It is what Reown will see, so it is the only
  // value that cannot be wrong.
  const fromWindow = normaliseOrigin(windowOrigin);
  if (fromWindow) return fromWindow;

  const fromEnv = normaliseOrigin(envUrl);
  if (fromEnv) return fromEnv;

  // No hardcoded product URL here on purpose. Guessing an origin is what caused
  // a testnet build to claim it was mainnet.
  return ORIGIN_UNKNOWN;
};

/**
 * Reduce a URL to `scheme://host[:port]`.
 *
 * Strips any path, query, hash and trailing slash, because Reown compares
 * origins and a value like `https://host/trading/PDEXUSDT` would never match.
 */
export const normaliseOrigin = (value?: string | null): string => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const parsed = new URL(trimmed);
    // Only http(s) can be a web origin. A stray "wss://" - easy to paste from
    // the RPC settings sitting next to this in the env file - is not one.
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.origin;
  } catch {
    // Not a parseable absolute URL. A bare hostname is a common mistake here and
    // is NOT a valid origin, so it is rejected rather than patched up: silently
    // prefixing https:// would hide a misconfiguration.
    return "";
  }
};

/**
 * Do the build-time env value and the live browser origin disagree?
 *
 * Reported rather than corrected. If these differ, the deployment was built with
 * the wrong NEXT_PUBLIC_APP_URL, and every other build-time inlined URL in the
 * bundle is suspect too - which is worth knowing about, not papering over.
 */
export const originMismatch = (
  windowOrigin?: string | null,
  envUrl?: string | null
): boolean => {
  const a = normaliseOrigin(windowOrigin);
  const b = normaliseOrigin(envUrl);
  if (!a || !b) return false;
  return a !== b;
};
