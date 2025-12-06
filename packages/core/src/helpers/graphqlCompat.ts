/**
 * GraphQL Compatibility Wrapper
 * 
 * Provides a compatibility layer that:
 * - Routes requests to AppSync or Rust backend based on feature flag
 * - Maintains same API as old appsync.ts helper
 * - Allows gradual migration without breaking existing code
 * - Logs which backend is being used for debugging
 */

import { isNewBackendEnabled } from '../config/graphql';
import { getApolloClient } from './graphql';
import { sendQueryToAppSync as sendQueryToAppSyncLegacy } from './appsync';

/**
 * Send GraphQL query/mutation with automatic backend selection
 * 
 * This function maintains compatibility with the old AppSync API
 * while supporting the new Rust GraphQL backend via feature flag.
 * 
 * @param params - Query parameters
 * @returns GraphQL response
 */
export async function sendQuery<T = any>({
    query,
    variables,
    token,
}: {
    query: string;
    variables?: Record<string, unknown>;
    token?: string;
}): Promise<T> {
    const useNewBackend = isNewBackendEnabled();

    if (useNewBackend) {
        // Use new Apollo Client (Rust GraphQL backend)
        console.log('[GraphQL] Using new Rust backend');

        const client = getApolloClient(token);

        try {
            const result = await client.query({
                query: require('graphql-tag')(query),
                variables,
                fetchPolicy: 'network-only',
            });

            return result.data as T;
        } catch (error) {
            console.error('[GraphQL] Query error:', error);
            throw error;
        }
    } else {
        // Use legacy AppSync
        console.log('[GraphQL] Using legacy AppSync backend');

        return await sendQueryToAppSyncLegacy({
            query,
            variables,
            token,
        }) as T;
    }
}

/**
 * Send GraphQL mutation with automatic backend selection
 * 
 * @param params - Mutation parameters
 * @returns GraphQL response
 */
export async function sendMutation<T = any>({
    mutation,
    variables,
    token,
}: {
    mutation: string;
    variables?: Record<string, unknown>;
    token?: string;
}): Promise<T> {
    const useNewBackend = isNewBackendEnabled();

    if (useNewBackend) {
        // Use new Apollo Client (Rust GraphQL backend)
        console.log('[GraphQL] Using new Rust backend for mutation');

        const client = getApolloClient(token);

        try {
            const result = await client.mutate({
                mutation: require('graphql-tag')(mutation),
                variables,
            });

            return result.data as T;
        } catch (error) {
            console.error('[GraphQL] Mutation error:', error);
            throw error;
        }
    } else {
        // Use legacy AppSync
        console.log('[GraphQL] Using legacy AppSync backend for mutation');

        return await sendQueryToAppSyncLegacy({
            query: mutation,
            variables,
            token,
        }) as T;
    }
}

/**
 * Subscribe to GraphQL subscription with automatic backend selection
 * 
 * Note: Subscriptions work differently between AppSync (MQTT) and Rust (WebSocket)
 * This is a simplified wrapper - full subscription migration requires more work
 * 
 * @param params - Subscription parameters
 * @returns Subscription observable
 */
export function subscribe({
    subscription,
    variables,
    token,
    onNext,
    onError,
    onComplete,
}: {
    subscription: string;
    variables?: Record<string, unknown>;
    token?: string;
    onNext: (data: any) => void;
    onError?: (error: any) => void;
    onComplete?: () => void;
}) {
    const useNewBackend = isNewBackendEnabled();

    if (useNewBackend) {
        // Use new Apollo Client (Rust GraphQL backend with WebSocket)
        console.log('[GraphQL] Using new Rust backend for subscription');

        const client = getApolloClient(token);

        const observable = client.subscribe({
            query: require('graphql-tag')(subscription),
            variables,
        });

        return observable.subscribe({
            next: (result: any) => onNext(result.data),
            error: onError,
            complete: onComplete,
        });
    } else {
        // Use legacy AppSync (MQTT subscriptions)
        console.log('[GraphQL] Using legacy AppSync backend for subscription');
        console.warn('[GraphQL] AppSync subscriptions not yet migrated to compatibility layer');

        // For now, throw error - subscriptions need special handling
        throw new Error('AppSync subscriptions should use original implementation for now');
    }
}

/**
 * Helper to check which backend is currently active
 */
export function getCurrentBackend(): 'appsync' | 'rust' {
    return isNewBackendEnabled() ? 'rust' : 'appsync';
}

/**
 * Helper to log backend status
 */
export function logBackendStatus(): void {
    const backend = getCurrentBackend();
    console.log(`[GraphQL] Current backend: ${backend.toUpperCase()}`);
    console.log(`[GraphQL] Feature flag USE_NEW_BACKEND: ${process.env.USE_NEW_BACKEND}`);
}
