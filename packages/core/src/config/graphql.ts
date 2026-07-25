/**
 * GraphQL Configuration Module
 *
 * Manages GraphQL endpoint configuration with support for:
 * - Feature flag to toggle between AppSync and Rust backend
 * - Environment-based endpoint selection
 * - Fallback configuration
 */

export interface GraphQLConfig {
  httpEndpoint: string;
  wsEndpoint: string;
  useNewBackend: boolean;
  readOnlyToken: string;
}

/**
 * Get GraphQL configuration based on environment variables
 */
export const getGraphQLConfig = (): GraphQLConfig => {
  const useNewBackend = process.env.USE_NEW_BACKEND === "true";

  if (useNewBackend) {
    // New Rust GraphQL backend
    return {
      httpEndpoint: process.env.GRAPHQL_URL || "http://localhost:8080/graphql",
      wsEndpoint: process.env.GRAPHQL_WS_URL || "ws://localhost:8080/ws",
      useNewBackend: true,
      readOnlyToken: process.env.READ_ONLY_TOKEN || "READ_ONLY",
    };
  } else {
    // Legacy AppSync backend
    return {
      httpEndpoint: process.env.GRAPHQL_URL || "",
      wsEndpoint: "", // AppSync uses MQTT, not standard WebSocket
      useNewBackend: false,
      readOnlyToken: process.env.READ_ONLY_TOKEN || "READ_ONLY",
    };
  }
};

/**
 * Check if new backend is enabled
 */
export const isNewBackendEnabled = (): boolean => {
  return process.env.USE_NEW_BACKEND === "true";
};

/**
 * Get authentication token
 * Priority: provided token > READ_ONLY_TOKEN
 */
export const getAuthToken = (token?: string): string => {
  const config = getGraphQLConfig();
  return token || config.readOnlyToken;
};
