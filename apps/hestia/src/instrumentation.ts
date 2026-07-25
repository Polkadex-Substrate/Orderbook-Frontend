/**
 * Next.js instrumentation hook — Sentry server & edge initialization.
 *
 * Replaces the old `sentry.server.config.js` / `sentry.edge.config.js` files
 * (Sentry v8 requires `Sentry.init` for the server/edge runtimes to run inside
 * `register()`, otherwise instrumentation is incomplete). The CLIENT init stays
 * in `sentry.client.config.js` — that one is still the correct location.
 */
import * as Sentry from "@sentry/nextjs";

const commonOptions = {
  dsn: process.env.SENTRY_DSN,
  // Capture 100% of transactions for performance monitoring.
  // Consider lowering this on a high-traffic production deployment.
  tracesSampleRate: 1.0,
  // Note: don't set `release` here — use the SENTRY_RELEASE env var so the
  // value also gets attached to uploaded source maps.
};

export async function register() {
  // Disabled in development, matching the previous config files' behaviour.
  if (process.env.NODE_ENV === "development") return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init(commonOptions);
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init(commonOptions);
  }
}

/**
 * Forwards App Router server-side errors (nested React Server Components etc.)
 * to Sentry. Required in Next.js 15 — these are not captured automatically.
 */
export const onRequestError = Sentry.captureRequestError;
