/**
 * Next.js instrumentation hook - Sentry server & edge initialization.
 *
 * Replaces the old `sentry.server.config.js` / `sentry.edge.config.js` files
 * (Sentry v8 requires `Sentry.init` for the server/edge runtimes to run inside
 * `register()`). The CLIENT init lives in `instrumentation-client.ts`.
 *
 * The `import * as Sentry` here used to be static, with the environment check
 * inside `register()`. That meant the 42 MB @sentry tree and its ~57 MB of
 * @opentelemetry dependencies were compiled into the server bundle on every
 * build - including in development, where register() returns immediately, and in
 * production, where an empty SENTRY_DSN makes init a no-op. It is also what made
 * `Compiling /instrumentation` slow enough to notice, and OpenTelemetry's dynamic
 * requires are the source of the "Critical dependency: the request of a
 * dependency is an expression" webpack warning.
 *
 * Imported inside the guard now, so nothing is loaded unless a DSN is set.
 */

import { resolveRelease } from "./sentryRelease";

const SENTRY_DSN = process.env.SENTRY_DSN;

// A DSN check as well as NODE_ENV: without one the SDK can report nothing, so
// loading it costs build time and memory for no benefit.
const enabled = () => process.env.NODE_ENV !== "development" && !!SENTRY_DSN;

// Keep in step with instrumentation-client.ts. Traces are quota-metered
// separately from errors, and exhausting the quota starts dropping errors too.
const tracesSampleRate = (() => {
  const raw = process.env.SENTRY_TRACES_SAMPLE_RATE;
  // Empty string means unset, not 0 - Number("") is 0, a valid rate, so
  // `SENTRY_TRACES_SAMPLE_RATE=` would silently turn tracing off.
  if (!raw) return 0.1;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : 0.1;
})();

const commonOptions = {
  dsn: SENTRY_DSN,
  tracesSampleRate,
  // Same value the client uses, so server and browser events for one deployment
  // land in the same Sentry environment. Unset, the SDK reports the literal
  // string "production" for every build, local ones included.
  environment:
    process.env.SENTRY_ENVIRONMENT ||
    (process.env.NODE_ENV === "production"
      ? "unspecified"
      : process.env.NODE_ENV),
  // Set explicitly, for the same reason as the client: the plugin's
  // release.name governs the build-time upload, not the runtime SDK, and
  // relying on injection left events untagged. See src/sentryRelease.ts.
  release: resolveRelease(
    process.env.NEXT_BUILD_ID,
    process.env.SENTRY_RELEASE
  ),
};

export async function register() {
  if (!enabled()) return;

  const runtime = process.env.NEXT_RUNTIME;
  if (runtime !== "nodejs" && runtime !== "edge") return;

  const Sentry = await import("@sentry/nextjs");
  Sentry.init(commonOptions);
}

/**
 * Forwards App Router server-side errors (nested React Server Components etc.)
 * to Sentry. Required in Next.js 15 - these are not captured automatically.
 *
 * Wrapped rather than re-exported directly: a bare
 * `export const onRequestError = Sentry.captureRequestError` needs the static
 * import this file exists to avoid. Loading on first error keeps the SDK out of
 * the graph for a deployment that never has one.
 */
export const onRequestError = async (
  ...args: Parameters<(typeof import("@sentry/nextjs"))["captureRequestError"]>
) => {
  if (!enabled()) return;
  const Sentry = await import("@sentry/nextjs");
  return Sentry.captureRequestError(...args);
};
