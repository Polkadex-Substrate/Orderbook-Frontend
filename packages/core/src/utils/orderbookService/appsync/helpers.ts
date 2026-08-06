// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

import {
  Maybe,
  sendQuery as sendQueryNew,
  sendMutation as sendMutationNew,
} from "@orderbook/core/helpers";

import { Websocket_streamsSubscription } from "../../../API";

import { BookUpdateEvent } from "./types";
import { readGqlPage } from "./pageEnvelope";
import { PriceLevel, Order } from "./../types";

/**
 * Shape of a GraphQL response envelope.
 *
 * Previously `GraphQLResult<T>` from `@aws-amplify/api`. Declared locally now:
 * it is a two-field envelope from the spec, not something Amplify defines, and
 * importing it was the last reason `@aws-amplify/api` appeared in this package.
 */
// `T = any` because writeStrategy uses it bare, as `(error as GraphQLResult)`,
// purely to reach `.errors` on a rejection.
export type GraphQLResponse<T = any> = {
  data?: T;
  errors?: { message: string }[];
};

type Props = {
  query: string;
  variables?: Record<string, unknown>;
  token?: string;
};

/**
 * Send a query or mutation to the Orderbook GraphQL backend.
 *
 * The operation type is sniffed from the document because callers pass raw
 * strings from the generated queries/mutations rather than telling us which is
 * which. Apollo needs them on different client methods.
 *
 * Name kept as `sendQueryToAppSync` for now: it is called from ~40 places
 * across the read and write strategies, and renaming it in the same commit
 * that swaps the transport would make any regression ambiguous between the two.
 * Rename once this is confirmed working against the backend.
 */
export async function sendQueryToAppSync<T = any>({
  query,
  variables,
  token,
}: Props): Promise<T> {
  const isMutation = /^mutation[\s({]/i.test(query.trim());

  if (isMutation) {
    return (await sendMutationNew({
      mutation: query,
      variables,
      token,
    })) as T;
  }
  return (await sendQueryNew({ query, variables, token })) as T;
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

    // readGqlPage guards the null-field case and raises the server's own error
    // message. It lives in its own import-free module so it can be unit tested
    // without dragging the Apollo transport into the test - see
    // pageEnvelope.test.ts for the cases this used to get wrong.
    const page = readGqlPage<any>(res, key);

    fullResponse = [...fullResponse, ...page.items];
    nextToken = page.nextToken;
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
  const bids = Object.entries(b).map(([p, q]): PriceLevel => ({
    side: "Bid",
    price: Number(p),
    qty: Number(q),
    seqNum: data.i,
  }));
  const asks = Object.entries(a).map(([p, q]): PriceLevel => ({
    side: "Ask",
    price: Number(p),
    qty: Number(q),
    seqNum: data.i,
  }));
  return [...bids, ...asks];
};

export function filterUserSubscriptionType(
  data: GraphQLResponse<Websocket_streamsSubscription>,
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
// instead of coercing them to 0 - a genuinely missing value (no trades in the
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
