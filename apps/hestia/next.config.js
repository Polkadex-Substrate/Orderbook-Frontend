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
});

const nextConfig = {
  webpack: (config) => {
    config.externals.push(
      "pino-pretty",
      "lokijs",
      "encoding",
      "porto",
      "@base-org/account",
    );
    // Force @headlessui/react to use its CJS build so webpack doesn't choke on
    // the ESM build's access of React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,
    // which isn't a named ESM export of React 18.
    config.resolve.alias["@headlessui/react"] = require.resolve(
      "@headlessui/react"
    );
    return config;
  },
  output: "standalone",
  transpilePackages: ["@orderbook/core", "@orderbook/chart"],
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
  generateBuildId: async () => {
    try {
      const gitCommitHash = execSync("git rev-parse HEAD").toString().trim();
      return gitCommitHash;
    } catch (error) {
      return "orderbookDefaultId";
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
    API_REGION: process.env.API_REGION,
    GRAPHQL_URL: process.env.GRAPHQL_URL,
    IDENTITY_POOL_ID: process.env.IDENTITY_POOL_ID,
    USER_POOL_ID: process.env.USER_POOL_ID,
    USER_WEB_CLIENT_ID: process.env.USER_WEB_CLIENT_ID,
    LANDING_PAGE: process.env.LANDING_PAGE,
    SIGNUP_DISABLED: process.env.SIGNUP_DISABLED,
    PIN_POINT_CLIENT_ID: process.env.PIN_POINT_CLIENT_ID,
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
    // SENTRY_AUTH removed: everything in this `env` block is inlined into the
    // CLIENT bundle at build time, so a write-scoped upload token was being
    // served to every visitor. Nothing read it. Source-map upload happens in
    // the build process, which reads process.env directly and never needed it
    // here.
    DISABLED_FEATURES: process.env.DISABLED_FEATURES,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GRAPHQL_WS_URL: process.env.GRAPHQL_WS_URL,
    USE_NEW_BACKEND: process.env.USE_NEW_BACKEND,
    SUBQUERY_URL: process.env.SUBQUERY_URL,
    READ_ONLY_TOKEN: process.env.READ_ONLY_TOKEN,
    DEFAULT_THEA_SOURCE_CHAIN: process.env.DEFAULT_THEA_SOURCE_CHAIN,
    DEFAULT_THEA_DESTINATION_CHAIN: process.env.DEFAULT_THEA_DESTINATION_CHAIN,
    DISABLED_THEA_CHAINS: process.env.DISABLED_THEA_CHAINS,
    NEXT_PUBLIC_HYPERBRIDGE_URL: process.env.NEXT_PUBLIC_HYPERBRIDGE_URL,
  },
};

const sentryWebpackPluginOptions = {
  // Additional config options for the Sentry webpack plugin. Keep in mind that
  // the following options are set automatically, and overriding them is not
  // recommended:
  //   release, url, configFile, stripPrefix, urlPrefix, include, ignore

  // An auth token is required for uploading source maps.
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Don't serve source maps to users: Sentry gets them during upload (when an
  // auth token is configured), then they're removed from the build output.
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  silent: true, // Suppresses all logs

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

const withSentryIfEnabled = (cfg) =>
  sentryEnabled ? withSentryConfig(cfg, sentryWebpackPluginOptions) : cfg;

module.exports = withBundleAnalyzer(withSentryIfEnabled(withPWA(nextConfig)));
