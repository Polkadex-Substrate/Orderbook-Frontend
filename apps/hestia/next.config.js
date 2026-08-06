/**
 * @type {import('next').NextConfig}
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { execSync } = require("child_process");

// eslint-disable-next-line @typescript-eslint/no-var-requires
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.NEXT_PUBLIC_ANALYZE === "true",
});
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { withSentryConfig } = require("@sentry/nextjs");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  register: true,
  disable: process.env.NODE_ENV === "development",
  // Navigations are served with workbox's NetworkFirst. Without a document
  // fallback, a failed navigation that has no cached copy leaves NetworkFirst
  // with nothing to return, so it throws and the browser shows a dead tab:
  //
  //   The FetchEvent for "/trading/WETHUSDT" resulted in a network error
  //   response: the promise was rejected.   /   no-response
  //
  // The plugin's default is "/_offline" - "or none if it doesn't exist" - and no
  // such page existed here, so there was no fallback at all. Note the TILDE: the
  // App Router treats "_offline" as a private folder and never routes it, so the
  // documented default name silently produces nothing. See src/app/~offline.
  fallbacks: { document: "/~offline" },
});

const nextConfig = {
  webpack: (config) => {
    config.externals.push(
      "pino-pretty",
      "lokijs",
      "encoding",
      "porto",
      "@base-org/account"
    );
    // Force @headlessui/react to use its CJS build so webpack doesn't choke on
    // the ESM build's access of React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,
    // which isn't a named ESM export of React 18.
    config.resolve.alias["@headlessui/react"] =
      require.resolve("@headlessui/react");
    return config;
  },
  output: "standalone",
  // @orderbook/format must be here too. All three workspace packages set
  // main to raw ./src/index.ts, so Next has to compile them itself - an
  // omitted entry is a build failure, not a runtime one, which is why it can
  // sit unnoticed through any number of `yarn dev` runs.
  transpilePackages: [
    "@orderbook/core",
    "@orderbook/chart",
    "@orderbook/format",
  ],
  experimental: {
    // @remixicon/react is a barrel file re-exporting ~3,200 icon components.
    // Webpack pulled the ENTIRE set into one 2.45 MB chunk even though the app
    // imports only ~69 named icons (which also pushed that chunk past the
    // service worker's precache size limit). This rewrites barrel imports to
    // direct per-icon module paths at build time.
    optimizePackageImports: ["@remixicon/react"],

    // Static generation forks workers that each inherit NODE_OPTIONS, so
    // --max_old_space_size is a per-worker budget rather than a build total.
    // Pinning this to 1 keeps that budget meaningful as the build hosts change
    // - the default scales with core count, so moving to a bigger machine
    // would otherwise silently multiply peak memory rather than just going
    // faster. Cheap for this app: it is a client-rendered trading UI with very
    // few static pages, so there is little to parallelise.
    //
    // On the current 2-core builder this is roughly what Next would pick
    // anyway; it matters on wider machines. Raise with NEXT_BUILD_CPUS only
    // alongside NODE_HEAP_MB (see Dockerfile) - they have to be sized together.
    cpus: Number(process.env.NEXT_BUILD_CPUS) || 1,
  },
  reactStrictMode: false,
  /**
   * Build id. MUST be unique per build.
   *
   * This used to shell out to `git rev-parse HEAD` and fall back to the constant
   * string "orderbookDefaultId". The Docker builder image has no git binary -
   * the build log says `/bin/sh: git: not found` - so EVERY image was built with
   * that same constant id.
   *
   * Which breaks caching in a way that is invisible until it bites. Next serves
   * `/_next/static/<buildId>/_buildManifest.js`, and unlike the content-hashed
   * chunks that filename carries no hash: the build id IS its version. nginx and
   * the Cloudflare rule both mark `/_next/static/` as immutable for a year, so a
   * browser that once cached that manifest keeps serving it across deploys - a
   * stale manifest pointing at chunk hashes the server no longer has. Result:
   * blank page on first load after a deploy, fine after a reload.
   *
   * NEXT_BUILD_ID is passed in by scripts/build-release.sh (version + short sha
   * + dirty flag). The git call remains for local `next build`, and the last
   * resort is a timestamp - never a constant, because a constant is the bug.
   */
  generateBuildId: async () => {
    if (process.env.NEXT_BUILD_ID) return process.env.NEXT_BUILD_ID;
    try {
      return execSync("git rev-parse HEAD").toString().trim();
    } catch {
      return `build-${Date.now()}`;
    }
  },
  // NOTE: Next 16 removed the `eslint` config key (and `next lint`). Linting is
  // no longer part of `next build` at all - run `yarn lint` (eslint directly).
  // WARNING: every value here is inlined into the client bundle at build time,
  // exactly like a NEXT_PUBLIC_* variable, but without the prefix that makes
  // that obvious. Treat this list as public. Never add a credential.
  //
  // Docker's build linter flags READ_ONLY_TOKEN, GOOGLE_API_KEY and
  // DEFAULT_TRANSFER_TOKEN as secrets-in-ENV. Those warnings are expected:
  //   - READ_ONLY_TOKEN is the unauthenticated AppSync token the browser must
  //     hold to open orderbook subscriptions - public by design.
  //   - GOOGLE_API_KEY is a browser API key; restrict it by HTTP referrer in
  //     the Google console, which is the only control that means anything for
  //     a key that ships to clients.
  //   - DEFAULT_TRANSFER_TOKEN is a currency ticker ("USDT"). Not a credential;
  //     the linter matched on the word "TOKEN".
  env: {
    POLKADEX_CHAIN: process.env.POLKADEX_CHAIN,
    GOOGLE_ANALYTICS: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
    ANALYZE: process.env.NEXT_PUBLIC_ANALYZE,
    // Removed with AWS Amplify: API_REGION, IDENTITY_POOL_ID, USER_POOL_ID,
    // USER_WEB_CLIENT_ID, PIN_POINT_CLIENT_ID (Cognito/Pinpoint config, read
    // only by the deleted aws-exports.js) and USE_NEW_BACKEND (the AppSync vs
    // Orderbook-backend flag - there is one backend now). None had any other
    // reader in src.
    GRAPHQL_URL: process.env.GRAPHQL_URL,
    LANDING_PAGE: process.env.LANDING_PAGE,
    SIGNUP_DISABLED: process.env.SIGNUP_DISABLED,
    MAINTENACE_MODE: process.env.MAINTENACE_MODE,
    SHOW_SHUTDOWN_POPUP: process.env.SHOW_SHUTDOWN_POPUP,
    UNDER_MAINTENACE: process.env.UNDER_MAINTENACE,
    ENABLE_LMP: process.env.ENABLE_LMP,
    IS_BRIDGE_ENABLED: process.env.IS_BRIDGE_ENABLED,
    MAIN_URL: process.env.MAIN_URL,
    BLOCKED_ASSETS: process.env.BLOCKED_ASSETS,
    DEFAULT_TRANSFER_TOKEN: process.env.DEFAULT_TRANSFER_TOKEN,
    SUBSCAN_API: process.env.SUBSCAN_API,
    SENTRY_DSN: process.env.SENTRY_DSN,
    SENTRY_TRACES_SAMPLE_RATE: process.env.SENTRY_TRACES_SAMPLE_RATE,
    SENTRY_REPLAY_SESSION_SAMPLE_RATE:
      process.env.SENTRY_REPLAY_SESSION_SAMPLE_RATE,
    // SENTRY_AUTH removed: everything in this `env` block is inlined into the
    // CLIENT bundle at build time, so a write-scoped upload token was being
    // served to every visitor. Nothing read it. Source-map upload happens in
    // the build process, which reads process.env directly and never needed it
    // here.
    DISABLED_FEATURES: process.env.DISABLED_FEATURES,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GRAPHQL_WS_URL: process.env.GRAPHQL_WS_URL,
    SUBQUERY_URL: process.env.SUBQUERY_URL,
    READ_ONLY_TOKEN: process.env.READ_ONLY_TOKEN,
    DEFAULT_THEA_SOURCE_CHAIN: process.env.DEFAULT_THEA_SOURCE_CHAIN,
    DEFAULT_THEA_DESTINATION_CHAIN: process.env.DEFAULT_THEA_DESTINATION_CHAIN,
    DISABLED_THEA_CHAINS: process.env.DISABLED_THEA_CHAINS,
    NEXT_PUBLIC_HYPERBRIDGE_URL: process.env.NEXT_PUBLIC_HYPERBRIDGE_URL,
  },
};

/*
 * Source map upload needs THREE things, and it silently does nothing if any one
 * is missing: an auth token, an org, and a project. Only the token was ever wired
 * up here, so nothing was ever uploaded and every Sentry stack frame arrived
 * minified - e.g. `at 23140/sy</< (chunks/00f76785...js:9:63466)` with 45 frames
 * hidden, which is unactionable.
 *
 * Note the token variable is SENTRY_AUTH_TOKEN. A differently-named SENTRY_AUTH
 * used to be passed as a Docker ARG and inlined into the browser bundle by
 * next.config's `env` block. Nothing read it - so that token was exposed to every
 * visitor while buying exactly nothing. It has been removed; if it was ever a real
 * token it should be rotated.
 */
const sentryWebpackPluginOptions = {
  // Additional config options for the Sentry webpack plugin. Keep in mind that
  // the following options are set automatically, and overriding them is not
  // recommended:
  //   release, url, configFile, stripPrefix, urlPrefix, include, ignore

  // Required for uploading source maps. Supplied as a BuildKit secret rather than
  // a build arg, so it never lands in an image layer or `docker history`.
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Without these two the upload is a no-op even with a valid token.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Don't serve source maps to users: Sentry gets them during upload (when an
  // auth token is configured), then they're removed from the build output.
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Was `true`, which hid upload failures. A silent no-op is the exact failure
  // mode this whole block exists to fix, so let the plugin say what it did.
  silent: false,

  // Don't fail the build if Sentry is unreachable. A deploy should not be blocked
  // by the error reporter's CDN; the cost is unsymbolicated frames for that build.
  errorHandler: (err) => {
    // eslint-disable-next-line no-console
    console.warn("[sentry] source map upload failed:", err.message);
  },

  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options.
};

// Sentry's webpack plugin instruments every module and generates source maps
// for the whole bundle - minutes of work and a large chunk of the build's peak
// memory. With no DSN configured that work is thrown away, and this repo has
// no sentry.*.config.ts files at all, so nothing initialises the SDK either.
// Only pay for it when it is actually wired up.
const sentryEnabled = Boolean(
  process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
);

// Warn loudly when the SDK is on but maps cannot be uploaded, rather than
// discovering it later from an unreadable stack trace in an alert email.
if (sentryEnabled) {
  const missing = ["SENTRY_AUTH_TOKEN", "SENTRY_ORG", "SENTRY_PROJECT"].filter(
    (k) => !process.env[k]
  );
  if (missing.length) {
    // eslint-disable-next-line no-console
    console.warn(
      `[sentry] DSN is set but ${missing.join(", ")} ${missing.length > 1 ? "are" : "is"} ` +
        `not - source maps will NOT be uploaded and stack traces will be minified.`
    );
  }
  if (!process.env.SENTRY_RELEASE) {
    // eslint-disable-next-line no-console
    console.warn(
      "[sentry] SENTRY_RELEASE is not set - events will have no release, so " +
        "regressions and suspect commits cannot be tracked."
    );
  }
}

const withSentryIfEnabled = (cfg) =>
  sentryEnabled ? withSentryConfig(cfg, sentryWebpackPluginOptions) : cfg;

module.exports = withBundleAnalyzer(withSentryIfEnabled(withPWA(nextConfig)));
