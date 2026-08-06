/**
 * @type {import('next').NextConfig}
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.NEXT_PUBLIC_ANALYZE === "false",
});
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { withSentryConfig } = require("@sentry/nextjs");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig = {
  transpilePackages: ["@orderbook/core"],
  reactStrictMode: false,
  generateBuildId: async () => {
    try {
      const gitCommitHash = execSync("git rev-parse HEAD").toString().trim();
      return gitCommitHash;
    } catch (error) {
      return "orderbookDefaultId";
    }
  },
  // Optional build-time configuration options
  sentry: {
    // See the sections below for information on the following options:
    //   'Configure Source Maps':
    //     - disableServerWebpackPlugin
    //     - disableClientWebpackPlugin
    //     - hideSourceMaps
    //     - widenClientFileUpload
    //   'Configure Legacy Browser Support':
    //     - transpileClientSDK
    //   'Configure Serverside Auto-instrumentation':
    //     - autoInstrumentServerFunctions
    //     - excludeServerRoutes
    //   'Configure Tunneling to avoid Ad-Blockers':
    //     - tunnelRoute
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
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
    SENTRY_AUTH: process.env.SENTRY_AUTH,
    DISABLED_FEATURES: process.env.DISABLED_FEATURES,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  },
};

const sentryWebpackPluginOptions = {
  // Additional config options for the Sentry webpack plugin. Keep in mind that
  // the following options are set automatically, and overriding them is not
  // recommended:
  //   release, url, configFile, stripPrefix, urlPrefix, include, ignore

  // An auth token is required for uploading source maps.
  authToken: process.env.SENTRY_AUTH_TOKEN,

  silent: true, // Suppresses all logs

  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options.
};

module.exports = withBundleAnalyzer(
  withSentryConfig(withPWA(nextConfig), sentryWebpackPluginOptions)
);
