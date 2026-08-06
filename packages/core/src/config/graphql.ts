/**
 * GraphQL endpoint configuration for the Orderbook backend.
 *
 * This used to carry a USE_NEW_BACKEND feature flag choosing between AWS
 * AppSync and the Orderbook GraphQL server. AppSync is gone, so the flag went
 * with it - and once the migration was finished the flag was actively harmful:
 * left unset, the app spoke AppSync's protocol to a server that does not
 * implement it. HTTP queries happened to survive that (a POST of
 * `{query, variables}` with an auth header looks the same either way), so the
 * mismatch surfaced only in subscriptions, as a dead `wss://host/realtime`.
 * That reads as a backend outage rather than a misconfigured frontend.
 *
 * The AppSync transport is in git history if it is ever needed again.
 */

export interface GraphQLConfig {
  httpEndpoint: string;
  wsEndpoint: string;
  readOnlyToken: string;
}

// Endpoints get concatenated with paths downstream, and `https://host//ws`
// fails to match server routes while looking near-identical in a log line.
const stripTrailingSlash = (url: string): string => url.replace(/\/+$/, "");

/**
 * Derive the WebSocket endpoint from the HTTP one when GRAPHQL_WS_URL is unset.
 *
 * The old fallback was a hardcoded `ws://localhost:8080/ws`, which in a
 * deployed build is never correct and fails looking like a server outage. The
 * same host over ws(s) is at least the right machine, so a wrong value here is
 * a wrong path - much easier to spot.
 */
const deriveWsEndpoint = (httpEndpoint: string): string =>
  `${stripTrailingSlash(
    httpEndpoint.replace(/^http/i, "ws").replace(/\/graphql$/i, "")
  )}/ws`;

export const getGraphQLConfig = (): GraphQLConfig => {
  const httpEndpoint = stripTrailingSlash(process.env.GRAPHQL_URL || "");
  const wsEndpoint = stripTrailingSlash(
    process.env.GRAPHQL_WS_URL ||
      (httpEndpoint ? deriveWsEndpoint(httpEndpoint) : "")
  );

  return {
    httpEndpoint,
    wsEndpoint,
    readOnlyToken: process.env.READ_ONLY_TOKEN || "READ_ONLY",
  };
};

/**
 * Get authentication token
 * Priority: provided token > READ_ONLY_TOKEN
 */
export const getAuthToken = (token?: string): string => {
  const config = getGraphQLConfig();
  return token || config.readOnlyToken;
};
