/**
 * Sentry browser initialization.
 *
 * Replaces `sentry.client.config.js` - Sentry v10 deprecated that file, and it
 * stops working entirely under Turbopack. Companion to `src/instrumentation.ts`
 * (server + edge).
 *
 * WHY THE IMPORT IS DYNAMIC
 *
 * This was a top-level `import * as Sentry from "@sentry/nextjs"` with the
 * `NODE_ENV !== "development"` check INSIDE the module. A static import is
 * unconditional: the whole @sentry/nextjs tree (42 MB, pulling ~57 MB of
 * @opentelemetry with it) was bundled and compiled even in development, where
 * `Sentry.init` provably never runs, and in production where SENTRY_DSN is empty
 * so the SDK initialises to a no-op.
 *
 * `next dev` compiles routes on first request, and this module is part of the
 * root layout's graph - so that cost landed on the first page load, which is
 * what produced the blank screen: the browser gave up on
 * /_next/static/chunks/app/layout.js (ChunkLoadError: timeout) or received it
 * half-written (SyntaxError: Invalid or unexpected token). A reload found it
 * compiled and worked, which is exactly the reported symptom.
 *
 * Moving the import inside the guard makes it a lazily-loaded chunk that is
 * never requested unless a DSN is configured.
 */

// A STATIC import here is deliberate, despite this file's rule about dynamic
// imports: sentryNoise.ts has zero imports of its own (a few hundred bytes of
// patterns), so it does not drag in the SDK. The rule exists to keep
// @sentry/nextjs out of the eager graph, not to ban all imports.
import { SENTRY_IGNORED_ERRORS } from "./sentryNoise";

// Gate on the DSN too, not just NODE_ENV: with no DSN the SDK cannot report
// anything, so loading it is pure cost.
const SENTRY_DSN = process.env.SENTRY_DSN;
const enabled = process.env.NODE_ENV !== "development" && !!SENTRY_DSN;

/**
 * Sampling rates, tunable per environment.
 *
 * Defaults are deliberately conservative. Traces and session replays are
 * quota-metered separately from errors, and at 1.0 a public trading UI - where a
 * single visitor generates continuous orderbook and chart activity - exhausts a
 * free-tier allowance quickly. Once the quota is gone Sentry drops events,
 * including the ERRORS you actually wanted, so over-sampling traces costs you
 * the thing you installed it for.
 *
 * Errors are always captured at 100%; only traces and replays are sampled.
 * Raise on testnet where traffic is low and detail is useful.
 */
const rate = (value: string | undefined, fallback: number) => {
  // Empty string must mean "unset", not 0: Number("") is 0, which is a valid
  // rate, so `SENTRY_TRACES_SAMPLE_RATE=` in an env file would silently disable
  // tracing instead of falling back to the default.
  if (!value) return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : fallback;
};

/**
 * Which deployment this is.
 *
 * Unset, the SDK defaults `environment` to the literal string "production" - so a
 * testnet deployment and a local production build both reported as "production",
 * and Sentry's environment filter was useless for telling them apart. Every event
 * in the project claimed to be production.
 *
 * Set this per deployment ("testnet", "staging", "production"). It is a build-time
 * value like everything else here, so it is baked per image.
 */
const ENVIRONMENT =
  process.env.SENTRY_ENVIRONMENT ||
  (process.env.NODE_ENV === "production"
    ? "unspecified"
    : process.env.NODE_ENV);

const TRACES_SAMPLE_RATE = rate(process.env.SENTRY_TRACES_SAMPLE_RATE, 0.1);
const REPLAY_SESSION_SAMPLE_RATE = rate(
  process.env.SENTRY_REPLAY_SESSION_SAMPLE_RATE,
  0
);

if (enabled) {
  // Fire-and-forget: nothing downstream awaits initialisation, and a failure to
  // load error reporting must not stop the app from booting.
  import("@sentry/nextjs")
    .then((Sentry) => {
      Sentry.init({
        dsn: SENTRY_DSN,
        // "unspecified" rather than a silent "production" default, so an
        // unconfigured deployment is visibly unconfigured in the environment
        // filter instead of masquerading as prod.
        environment: ENVIRONMENT,
        // Replay may only be enabled on the client.
        integrations: [Sentry.replayIntegration()],
        // Normal user behaviour is not a defect. Chief among these is a bare
        // "Rejected" - a declined wallet signature - which sat in the issue list
        // with the same weight as a real crash, training everyone to skim it.
        // sentryNoise.ts holds the admission rule and the over-match guards
        // (an ENGINE rejection must still be reported; a user's must not).
        ignoreErrors: SENTRY_IGNORED_ERRORS,
        tracesSampleRate: TRACES_SAMPLE_RATE,
        // 0 by default: record no routine sessions, but keep 100% of sessions
        // that hit an error. That is where replay earns its quota - a replay of
        // a session where nothing went wrong is rarely watched.
        //
        // Note this records wallet addresses, balances and order sizes. Check it
        // against the Privacy Policy before raising the session rate, and
        // consider replayIntegration({ maskAllText, blockAllMedia }).
        replaysSessionSampleRate: REPLAY_SESSION_SAMPLE_RATE,
        replaysOnErrorSampleRate: 1.0,
        // Note: don't set `release` here - use the SENTRY_RELEASE env var so the
        // value also gets attached to uploaded source maps.
      });
    })
    .catch((e) => console.error("[sentry] failed to initialise:", e));
}

/**
 * Instruments navigations so Sentry can measure client-side route changes.
 *
 * Next calls this on every client navigation, so it cannot await a dynamic
 * import without delaying the transition. It resolves the real hook lazily and
 * drops events until the SDK has loaded - losing route timings for the first
 * moments after boot is an acceptable trade for not blocking navigation.
 *
 * `captureRouterTransitionStart` landed in @sentry/nextjs v9; this repo pins v8,
 * where it does not exist - hence the optional property type and the computed
 * key lookup (a direct access, even through a cast, makes webpack emit
 * "Attempted import error" for a name v8 does not export).
 */
type WithRouterTransition = {
  captureRouterTransitionStart?: (href: string, navigationType: string) => void;
};

const exportName = "captureRouterTransitionStart" as const;

let routerTransitionHook: WithRouterTransition[typeof exportName] | undefined;

if (enabled) {
  import("@sentry/nextjs")
    .then((Sentry) => {
      routerTransitionHook = (Sentry as WithRouterTransition)[exportName];
    })
    .catch(() => undefined);
}

export const onRouterTransitionStart = (
  href: string,
  navigationType: string
) => {
  routerTransitionHook?.(href, navigationType);
};
