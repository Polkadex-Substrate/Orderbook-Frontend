/**
 * Thin wrappers over the Apollo client for the Orderbook GraphQL backend.
 *
 * This was a compatibility layer that routed each call to either AppSync or the
 * Orderbook backend behind the USE_NEW_BACKEND flag. AppSync is gone, so both
 * the flag and the legacy branch are gone; the file is kept because callers
 * pass query strings rather than gql documents, and parsing them here keeps
 * that boundary in one place.
 *
 * The per-call `console.log` announcing which backend was in use is also gone.
 * With one backend it was pure noise on a page that issues a query per market,
 * and it drowned out the errors worth reading.
 */

import gql from "graphql-tag";

import { getApolloClient } from "./graphql";

export async function sendQuery<T = any>({
  query,
  variables,
  token,
}: {
  query: string;
  variables?: Record<string, unknown>;
  token?: string;
}): Promise<T> {
  const client = getApolloClient(token);

  // fetchPolicy "network-only": these are live market/orderbook reads and a
  // cached answer is a wrong answer.
  const result = await client.query({
    query: gql(query),
    variables,
    fetchPolicy: "network-only",
  });

  return { data: result.data } as unknown as T;
}

export async function sendMutation<T = any>({
  mutation,
  variables,
  token,
}: {
  mutation: string;
  variables?: Record<string, unknown>;
  token?: string;
}): Promise<T> {
  const client = getApolloClient(token);

  const result = await client.mutate({
    mutation: gql(mutation),
    variables,
  });

  return { data: result.data } as unknown as T;
}

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
  const client = getApolloClient(token);

  const observable = client.subscribe({
    query: gql(subscription),
    variables,
  });

  return observable.subscribe({
    next: (result: any) => onNext(result.data),
    error: onError,
    complete: onComplete,
  });
}
