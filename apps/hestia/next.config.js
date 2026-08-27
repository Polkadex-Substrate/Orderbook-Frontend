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

  /*
   * DOCUMENTS ARE NEVER SERVED FROM CACHE WHILE ONLINE. This overrides the
   * plugin's three document caches, and it is the fix for the recurring
   * "Page Unresponsive" freeze.
   *
   * THE MECHANISM, FINALLY. The default caches documents with NetworkFirst,
   * networkTimeoutSeconds: 10 and a 24-HOUR expiry. So on any load where the
   * server takes more than ten seconds - and the freezes always correlated with
   * slow loads - the service worker silently serves YESTERDAY'S HTML from
   * cache. That HTML references its own build's chunks, which are cached
   * immutably, so AN ENTIRE OLD BUILD EXECUTES: including builds that still
   * contained the genuine main-thread bugs fixed since (the error-boundary
   * render loop, the decimal formatter's unbounded loop, the unscoped wallet
   * stack). Every "fixed, then returned" cycle of the freeze was this - the fix
   * was live, and the service worker occasionally time-travelled the user back
   * to a build from before it.
   *
   * The observation that cracked it: a bookmarked shortcut froze while
   * incognito was always fine. Incognito runs no service worker, so it always
   * gets the current build. It also explains Sentry still receiving events
   * from PRE-HYPHEN URLs (/trading/PDEXUSDT) days after that build was
   * replaced, which otherwise made no sense.
   *
   * NetworkOnly means: online users always get the deployed build, however
   * slow the server is - ten seconds of spinner is strictly better than
   * yesterday's bugs - and OFFLINE users get the ~offline fallback page, which
   * still works because fallbacks apply when the handler fails. Assets keep
   * their default caching: chunk filenames are content-hashed, so a cached
   * chunk can never be wrong, only orphaned.
   *
   * `extendDefaultRuntimeCaching` keeps every other default entry; entries
   * here REPLACE defaults that share a cacheName.
   */
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: ({ request, url: { pathname }, sameOrigin }) =>
          request.headers.get("RSC") === "1" &&
          request.headers.get("Next-Router-Prefetch") === "1" &&
          sameOrigin &&
          !pathname.startsWith("/api/"),
        handler: "NetworkOnly",
        options: { cacheName: "pages-rsc-prefetch" },
      },
      {
        urlPattern: ({ request, url: { pathname }, sameOrigin }) =>
          request.headers.get("RSC") === "1" &&
          sameOrigin &&
          !pathname.startsWith("/api/"),
        handler: "NetworkOnly",
        options: { cacheName: "pages-rsc" },
      },
      {
        /*
         * NAVIGATIONS ONLY, deliberately narrower than the default 'pages'
         * pattern (which was any same-origin non-API request). Custom entries
         * are placed BEFORE the default asset caches by
         * extendDefaultRuntimeCaching, so a broad pattern here would swallow
         * script/style/image requests before the asset entries could cache
         * them. `mode === "navigate"` is exactly "the browser is loading a
         * document", which is the only thing that must never come from cache.
         */
        urlPattern: ({ request, url: { pathname }, sameOrigin }) =>
          request.mode === "navigate" &&
          sameOrigin &&
          !pathname.startsWith("/api/"),
        handler: "NetworkOnly",
        options: { cacheName: "pages" },
      },
    ],
  },
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
    // Added 2026-08-10. instrumentation-client.ts and instrumentation.ts both
    // read process.env.SENTRY_ENVIRONMENT, but it was never inlined here - so
    // in the browser it was undefined and fell back to the literal
    // "unspecified", no matter what the deploy env file said. The env file had
    // been correct for hours; the value simply had no route into the bundle.
    //
    // The failure is invisible from the ops side: `grep SENTRY_ENVIRONMENT .env`
    // shows it set, the build passes it as an ARG, and the page still reports
    // "unspecified". Only a read of THIS list explains it. Anything read as
    // `process.env.X` in client code and absent from this block is dead.
    SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT,
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
  //   url, configFile, stripPrefix, urlPrefix, include, ignore

  // RELEASE IS OVERRIDDEN DELIBERATELY, despite the note above.
  //
  // Left alone, the plugin auto-detects the release from git and uses the full
  // 40-character commit SHA. That is what appeared on ORDERBOOK-TESTNET-4:
  //
  //   release: 477e206577b92010aff1b92999c66e4a66010832
  //
  // Source maps still resolved, because the SDK and the plugin agreed on that
  // same auto-detected value. But nothing else lines up: the artifact stamp,
  // /opt/orderbook-fe/RELEASE, the deploy log and the served page all say
  // `0.1.0-<short sha>`. So an operator holding a Sentry issue cannot tell which
  // deploy produced it without translating between two identifiers by hand.
  //
  // NEXT_BUILD_ID is the one identity used everywhere else, so use it here.
  // Falls back to the plugin's git detection when unset (local dev), which is
  // better than an empty release.
  // BLOCKER B4, 2026-08-14: the precedence used to be SENTRY_RELEASE first.
  //
  // Testnet events on 14 Aug carried `release: 6.108.0` while the build stamp
  // said `0.1.0-167ac0b1`, so something in the deploy environment exports a
  // SENTRY_RELEASE that is not this application's version. Because that variable
  // won, every event was tagged with an identity matching no build we ship.
  //
  // This is not cosmetic. Release tagging is the ONLY mechanism that answers
  // "did the fixed build produce this error", and its absence caused three wrong
  // conclusions in a row about ORDERBOOK-TESTNET-2: without it, an error after a
  // deploy is indistinguishable from a stale bundle still in someone's tab.
  //
  // NEXT_BUILD_ID is the identity used by the artifact stamp, RELEASE file,
  // deploy log and served page, so it now wins. SENTRY_RELEASE remains as an
  // explicit override for anyone who needs one, and a disagreement is reported
  // rather than silently resolved.
  release: {
    name: process.env.NEXT_BUILD_ID || process.env.SENTRY_RELEASE || undefined,
  },

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
  if (!process.env.SENTRY_RELEASE && !process.env.NEXT_BUILD_ID) {
    // eslint-disable-next-line no-console
    console.warn(
      "[sentry] neither NEXT_BUILD_ID nor SENTRY_RELEASE is set - events will " +
        "have no release, so regressions and suspect commits cannot be tracked."
    );
  }
  // B4: surface the disagreement that produced `release: 6.108.0` rather than
  // resolving it quietly. A release that names no shipped build is worse than
  // no release at all, because it looks trustworthy.
  if (
    process.env.SENTRY_RELEASE &&
    process.env.NEXT_BUILD_ID &&
    process.env.SENTRY_RELEASE !== process.env.NEXT_BUILD_ID
  ) {
    // eslint-disable-next-line no-console
    console.warn(
      `[sentry] SENTRY_RELEASE ("${process.env.SENTRY_RELEASE}") disagrees with ` +
        `NEXT_BUILD_ID ("${process.env.NEXT_BUILD_ID}"). Using NEXT_BUILD_ID, ` +
        "which is the identity in the artifact stamp and deploy log. Unset " +
        "SENTRY_RELEASE in the deploy environment unless the override is intended."
    );
  }
}

const withSentryIfEnabled = (cfg) =>
  sentryEnabled ? withSentryConfig(cfg, sentryWebpackPluginOptions) : cfg;

module.exports = withBundleAnalyzer(withSentryIfEnabled(withPWA(nextConfig)));
