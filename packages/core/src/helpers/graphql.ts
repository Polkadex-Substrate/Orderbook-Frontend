/**
 * Apollo Client setup for the Orderbook GraphQL backend.
 *
 * - HTTP link for queries and mutations
 * - graphql-ws link for subscriptions
 * - split() routes each operation to the right transport
 * - Authorization header injection
 * - Centralised error logging
 *
 * ("Rust GraphQL Backend" in the old header, and "AppSync" further down, both
 * predate the migration. There is one backend; it is the Orderbook GraphQL
 * server, reached via GRAPHQL_URL / GRAPHQL_WS_URL.)
 */

import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  split,
  ApolloLink,
  from,
  NormalizedCacheObject,
  type DefaultOptions,
} from "@apollo/client";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { getMainDefinition } from "@apollo/client/utilities";
import { createClient } from "graphql-ws";
import { onError } from "@apollo/client/link/error";

import { getGraphQLConfig, getAuthToken } from "../config/graphql";

/**
 * Create HTTP link for queries and mutations
 */
const createHttpLink = (token?: string): HttpLink => {
  const config = getGraphQLConfig();
  const authToken = getAuthToken(token);

  return new HttpLink({
    uri: config.httpEndpoint,
    headers: {
      Authorization: authToken,
    },
  });
};

/**
 * Create WebSocket link for subscriptions
 */
const createWsLink = (token?: string): GraphQLWsLink | null => {
  const config = getGraphQLConfig();

  // No endpoint means no subscriptions. This used to also require the
  // useNewBackend flag, which is gone - config now derives wsEndpoint from
  // GRAPHQL_URL when GRAPHQL_WS_URL is unset, so this is only null when
  // GRAPHQL_URL itself is missing.
  if (!config.wsEndpoint) {
    console.warn(
      "[GraphQL WS] No wsEndpoint resolved (GRAPHQL_URL unset?) - subscriptions disabled."
    );
    return null;
  }

  const authToken = getAuthToken(token);

  return new GraphQLWsLink(
    createClient({
      url: config.wsEndpoint,
      connectionParams: {
        Authorization: authToken,
      },
      // Reconnection configuration
      retryAttempts: 5,
      shouldRetry: () => true,
      on: {
        connected: () => console.log("[GraphQL WS] Connected"),
        closed: () => console.log("[GraphQL WS] Closed"),
        error: (error) => console.error("[GraphQL WS] Error:", error),
      },
    })
  );
};

/**
 * Create error link for centralized error handling.
 *
 * Every failure logs exactly ONE console.error, with the operation name inside
 * it. Previously the operation name was a separate `console.error` emitted
 * after the details, so Next's dev overlay - which surfaces the most recent
 * console error - always showed `[Operation]: GetKlinesByMarketInterval` and
 * never the message explaining why it failed. The useful line was in the
 * console, just not the one anything pointed at.
 *
 * Network errors also get unpacked rather than template-stringified. Apollo
 * wraps a non-2xx GraphQL response as a ServerError carrying `statusCode` and
 * `result` (the parsed response body); `${networkError}` throws all of that
 * away and yields a bare "Response not successful: Received status code 400",
 * which is indistinguishable from a dozen different server-side causes.
 */
const createErrorLink = (): ApolloLink => {
  return onError(({ graphQLErrors, networkError, operation }: any) => {
    const op = operation?.operationName ?? "unknown operation";

    if (graphQLErrors?.length) {
      graphQLErrors.forEach(({ message, path }: any) => {
        console.error(
          `[GraphQL] ${op} failed: ${message}${
            path
              ? ` (path: ${Array.isArray(path) ? path.join(".") : path})`
              : ""
          }`
        );
      });
    }

    if (networkError) {
      const status = (networkError as any).statusCode;
      // ServerError.result holds the parsed body, which is where a GraphQL
      // server puts the actual reason for a 400/500.
      const body = (networkError as any).result;
      console.error(
        `[GraphQL] ${op} network error${status ? ` (HTTP ${status})` : ""}: ${
          networkError.message
        }`,
        body ?? networkError
      );
    }

    // Neither bucket populated means the failure is in the link chain itself
    // (bad URL, CORS preflight, no transport) - worth saying so explicitly
    // rather than logging a bare operation name and leaving it a mystery.
    if (!graphQLErrors?.length && !networkError) {
      console.error(
        `[GraphQL] ${op} failed with no graphQLErrors and no networkError - check the endpoint URL, CORS, and that a transport exists for this operation type.`
      );
    }
  });
};

/**
 * Create split link that routes operations to appropriate transport
 */
const createSplitLink = (token?: string): ApolloLink => {
  const httpLink = createHttpLink(token);
  const wsLink = createWsLink(token);
  const errorLink = createErrorLink();

  // No WebSocket link means no wsEndpoint was resolvable. Queries and
  // mutations still work over HTTP; subscriptions will simply never fire.
  if (!wsLink) {
    return from([errorLink, httpLink]);
  }

  // Split based on operation type
  const splitLink = split(
    ({ query }) => {
      const definition = getMainDefinition(query);
      return (
        definition.kind === "OperationDefinition" &&
        definition.operation === "subscription"
      );
    },
    wsLink,
    httpLink
  );

  return from([errorLink, splitLink]);
};

/**
 * Create Apollo Client instance
 *
 * @param token - Optional authentication token (defaults to READ_ONLY_TOKEN)
 * @returns Configured Apollo Client instance
 */
export const createApolloClient = (token?: string) => {
  const link = createSplitLink(token);

  return new ApolloClient({
    link,
    cache: new InMemoryCache({
      // Cache configuration
      typePolicies: {
        Query: {
          fields: {
            // Add field policies here if needed
          },
        },
      },
    }),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: "cache-and-network",
        errorPolicy: "all",
      },
      query: {
        fetchPolicy: "network-only",
        errorPolicy: "all",
      },
      mutate: {
        errorPolicy: "all",
      },
    } as unknown as DefaultOptions,
  });
};

/**
 * Cached clients, keyed by auth token.
 *
 * This was a single instance ignoring the token argument after the first call.
 * The Authorization header is baked into the links at construction time, so
 * whichever token arrived first won for the rest of the session: the app opens
 * with READ_ONLY_TOKEN for public market data, and every later
 * `getApolloClient(userToken)` silently got the read-only client back. User
 * queries and subscriptions then ran unauthenticated - returning empty rather
 * than erroring, which is the hardest kind of failure to notice.
 *
 * Keyed by token instead. In practice this holds at most two entries
 * (read-only and the signed-in user).
 */
const apolloClients = new Map<string, ReturnType<typeof createApolloClient>>();

/**
 * Get or create the Apollo Client for a given token.
 *
 * @param token - Optional authentication token (defaults to READ_ONLY_TOKEN)
 * @param forceNew - Rebuild this token's client even if one is cached
 */
export const getApolloClient = (token?: string, forceNew = false) => {
  // Resolve through getAuthToken so an explicit read-only token and an omitted
  // one share a cache entry rather than building two identical clients.
  const key = getAuthToken(token);

  if (forceNew || !apolloClients.has(key)) {
    apolloClients.set(key, createApolloClient(token));
  }
  return apolloClients.get(key)!;
};

/**
 * Drop all cached clients. Use on logout or token refresh.
 */
export const resetApolloClient = (): void => {
  apolloClients.forEach((client) => client.clearStore());
  apolloClients.clear();
};
