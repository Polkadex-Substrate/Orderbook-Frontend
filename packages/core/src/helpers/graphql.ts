/**
 * Apollo Client Setup for Rust GraphQL Backend
 * 
 * Provides a unified GraphQL client with:
 * - HTTP link for queries and mutations
 * - WebSocket link for subscriptions
 * - Automatic routing based on operation type
 * - Authentication header injection
 * - Error handling
 */

import {
    ApolloClient,
    InMemoryCache,
    HttpLink,
    split,
    ApolloLink,
    from,
    NormalizedCacheObject,
} from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';
import { onError } from '@apollo/client/link/error';

import { getGraphQLConfig, getAuthToken } from '../config/graphql';

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

    // Only create WebSocket link if using new backend
    if (!config.useNewBackend || !config.wsEndpoint) {
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
                connected: () => console.log('[GraphQL WS] Connected'),
                closed: () => console.log('[GraphQL WS] Closed'),
                error: (error) => console.error('[GraphQL WS] Error:', error),
            },
        })
    );
};

/**
 * Create error link for centralized error handling
 */
const createErrorLink = (): ApolloLink => {
    return onError(({ graphQLErrors, networkError, operation }: any) => {
        if (graphQLErrors) {
            graphQLErrors.forEach(({ message, locations, path }: any) => {
                console.error(
                    `[GraphQL Error]: Message: ${message}, Location: ${JSON.stringify(locations)}, Path: ${path}`
                );
            });
        }

        if (networkError) {
            console.error(`[Network Error]: ${networkError}`);
        }

        console.error(`[Operation]: ${operation.operationName}`);
    });
};

/**
 * Create split link that routes operations to appropriate transport
 */
const createSplitLink = (token?: string): ApolloLink => {
    const httpLink = createHttpLink(token);
    const wsLink = createWsLink(token);
    const errorLink = createErrorLink();

    // If no WebSocket link (using AppSync), just use HTTP
    if (!wsLink) {
        return from([errorLink, httpLink]);
    }

    // Split based on operation type
    const splitLink = split(
        ({ query }) => {
            const definition = getMainDefinition(query);
            return (
                definition.kind === 'OperationDefinition' &&
                definition.operation === 'subscription'
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
export const createApolloClient = (token?: string): ApolloClient<NormalizedCacheObject> => {
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
        // Development mode settings
        defaultOptions: {
            watchQuery: {
                fetchPolicy: 'cache-and-network',
                errorPolicy: 'all',
            },
            query: {
                fetchPolicy: 'network-only',
                errorPolicy: 'all',
            },
            mutate: {
                errorPolicy: 'all',
            },
        },
    });
};

/**
 * Singleton Apollo Client instance
 * Can be reused across the application
 */
let apolloClientInstance: ApolloClient<NormalizedCacheObject> | null = null;

/**
 * Get or create Apollo Client instance
 * 
 * @param token - Optional authentication token
 * @param forceNew - Force creation of new instance
 * @returns Apollo Client instance
 */
export const getApolloClient = (
    token?: string,
    forceNew = false
): ApolloClient<NormalizedCacheObject> => {
    if (!apolloClientInstance || forceNew) {
        apolloClientInstance = createApolloClient(token);
    }
    return apolloClientInstance;
};

/**
 * Reset Apollo Client instance
 * Useful for logout or token refresh
 */
export const resetApolloClient = (): void => {
    if (apolloClientInstance) {
        apolloClientInstance.clearStore();
        apolloClientInstance = null;
    }
};
