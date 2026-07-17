// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

import { API as amplifyApi } from "aws-amplify";
import { GRAPHQL_AUTH_MODE } from "@aws-amplify/auth";
import { READ_ONLY_TOKEN } from "@orderbook/core/constants";
import { Maybe } from "@orderbook/core/helpers";
import { GraphQLResult, GraphQLSubscription } from "@aws-amplify/api";

// Import new GraphQL infrastructure
import { isNewBackendEnabled, sendQuery as sendQueryNew, sendMutation as sendMutationNew } from "@orderbook/core/helpers";

import { Websocket_streamsSubscription } from "../../../API";

import { BookUpdateEvent } from "./types";
import { PriceLevel, Order } from "./../types";

type Props = {
  query: string;
  variables?: Record<string, unknown>;
  token?: string;
  authMode?: keyof typeof GRAPHQL_AUTH_MODE;
  API?: typeof amplifyApi;
};

/**
 * Send query to GraphQL backend
 * Routes to new Rust backend or legacy AppSync based on feature flag
 */
export async function sendQueryToAppSync<T = any>({
  query,
  variables,
  token,
  authMode = GRAPHQL_AUTH_MODE.AWS_LAMBDA,
  API = amplifyApi,
}: Props): Promise<T> {
  // Check if new backend is enabled
  if (isNewBackendEnabled()) {
    // Detect operation type from the query string
    const trimmed = query.trim();
    const isMutation = /^mutation[\s({]/i.test(trimmed);

    if (isMutation) {
      return await sendMutationNew({ mutation: query, variables, token }) as T;
    }
    return await sendQueryNew({ query, variables, token }) as T;
  }

  // Legacy AppSync implementation
  const authOptions = {
    [GRAPHQL_AUTH_MODE.AWS_LAMBDA]: {
      query,
      variables,
      authToken: token ?? READ_ONLY_TOKEN,
    },
  };

  const requestOptions = authOptions[authMode];
  if (!requestOptions) throw new Error("Invalid authentication type.");
  return API.graphql(requestOptions) as T;
}

export const fetchFullListFromAppSync = async <T = any>(
  query: string,
  variables: Record<string, unknown>,
  key: string
): Promise<T[]> => {
  let fullResponse: any[] = [];
  let nextToken = null;
  do {
    const res = await sendQueryToAppSync({
      query,
      variables: nextToken ? { ...variables, nextToken } : variables,
    });
    fullResponse = [...fullResponse, ...(res.data[key]?.items || [])];
    nextToken = res.data[key].nextToken;
  } while (nextToken);
  return fullResponse as T[];
};

export const fetchListFromAppSync = async <T = any[]>(
  query: string,
  variables: Record<string, unknown>,
  key: string
): Promise<{ response: T; nextToken: Maybe<string> }> => {
  const res = await sendQueryToAppSync({
    query,
    variables,
  });

  const fullResponse = res.data[key]?.items;

  const nextToken = res.data[key]?.nextToken;

  return { response: fullResponse, nextToken };
};

export const fetchBatchFromAppSync = async <T = any[]>(
  query: string,
  variables: Record<string, any>,
  key: string,
  LIST_LIMIT: number
): Promise<{ response: any[]; nextToken: Maybe<string> }> => {
  let nextToken = variables.nextToken;
  let response: any[] = [];
  do {
    const { nextToken: newNextToken, response: newResponse } =
      await fetchListFromAppSync(
        query,
        nextToken ? { ...variables, nextToken } : variables,
        key
      );
    response = [...response, ...(newResponse || [])];
    nextToken = newNextToken;
  } while (response.length < LIST_LIMIT && nextToken);
  return { response, nextToken };
};

export const convertBookUpdatesToPriceLevels = (
  data: BookUpdateEvent
): PriceLevel[] => {
  const { b, a } = data;
  const bids = Object.entries(b).map(
    ([p, q]): PriceLevel => ({
      side: "Bid",
      price: Number(p),
      qty: Number(q),
      seqNum: data.i,
    })
  );
  const asks = Object.entries(a).map(
    ([p, q]): PriceLevel => ({
      side: "Ask",
      price: Number(p),
      qty: Number(q),
      seqNum: data.i,
    })
  );
  return [...bids, ...asks];
};

export function filterUserSubscriptionType(
  data: GraphQLResult<GraphQLSubscription<Websocket_streamsSubscription>>,
  type: string
) {
  return Boolean(
    data?.data?.websocket_streams?.data &&
    JSON.parse(data?.data.websocket_streams.data).type === type
  );
}

export const replaceOrPushOrder = (
  orders: Order[],
  newOrder: Order
): Order[] => {
  const index = orders.findIndex((order) => order.orderId === newOrder.orderId);
  if (index === -1) {
    return [...orders, newOrder];
  }
  return [...orders.slice(0, index), newOrder, ...orders.slice(index + 1)];
};

// Converts a GraphQL numeric-string field to a number, preserving null/undefined
// instead of coercing them to 0 — a genuinely missing value (no trades in the
// ticker window) must stay distinguishable from a real value of zero.
export const toNullableNumber = (
  value: string | number | null | undefined
): number | null =>
  value === null || value === undefined ? null : Number(value);

export const removeOrderFromList = (
  orders: Order[],
  newOrder: Order
): Order[] => {
  const index = orders.findIndex((order) => order.orderId === newOrder.orderId);
  if (index === -1) {
    return orders;
  }
  return [...orders.slice(0, index), ...orders.slice(index + 1)];
};
