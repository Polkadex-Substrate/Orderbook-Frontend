/**
 * Sentry browser initialization.
 *
 * Replaces `sentry.client.config.js` — Sentry v10 deprecated that file, and it
 * stops working entirely under Turbopack. Companion to `src/instrumentation.ts`
 * (server + edge).
 */
import * as Sentry from "@sentry/nextjs";

if (process.env.NODE_ENV !== "development") {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    // Replay may only be enabled on the client.
    integrations: [Sentry.replayIntegration()],
    // Capture 100% of transactions for performance monitoring.
    // Consider lowering on a high-traffic production deployment.
    tracesSampleRate: 1.0,
    // Replay for 10% of all sessions, plus 100% of sessions with an error.
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    // Note: don't set `release` here — use the SENTRY_RELEASE env var so the
    // value also gets attached to uploaded source maps.
  });
}

/**
 * Instruments navigations so Sentry can measure client-side route changes.
 *
 * `captureRouterTransitionStart` landed in @sentry/nextjs v9; this repo pins v8,
 * where it doesn't exist. Reading it through an optional-property type keeps
 * this compiling on v8 (the export is simply `undefined`, and Next skips the
 * hook) and starts working automatically if Sentry is upgraded. Referencing it
 * directly is a type error under v8.
 */
type WithRouterTransition = {
  captureRouterTransitionStart?: (href: string, navigationType: string) => void;
};

// Computed key: a direct property access (even through a cast) is statically
// analyzed by webpack, which emits "Attempted import error" for names v8
// doesn't export. Looking it up dynamically keeps the build output quiet.
const exportName = "captureRouterTransitionStart" as const;
export const onRouterTransitionStart = (Sentry as WithRouterTransition)[
  exportName
];
