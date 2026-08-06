/**
 * Normalise Apollo Client 4's error shape into the flat `errors` array the rest
 * of this codebase reads.
 *
 * WHY THIS IS NEEDED
 * Apollo 4 does not put GraphQL errors on `result.errors`. It wraps them in a
 * `CombinedGraphQLErrors` instance and exposes that as `result.error` - singular.
 * The whole read/write layer here was written against the older `errors: [...]`
 * envelope, so the two never met:
 *
 *   - `sendQuery` returned `{ data: result.data }` and dropped the error entirely.
 *   - `writeStrategy` inspected `(error as GraphQLResult).errors`, which is
 *     undefined for both a plain Error and an Apollo 4 result.
 *
 * Combined with `errorPolicy: "all"` - which makes Apollo RESOLVE rather than
 * reject on a GraphQL error - a failed mutation looked exactly like a successful
 * one, and the UI announced "Order Placed" for orders the server had refused.
 *
 * Import-free so it can be unit tested without constructing an Apollo client.
 */

/** The subset of CombinedGraphQLErrors / Error this needs to read. */
type ApolloErrorLike = {
  errors?: ReadonlyArray<{ message?: string } | null | undefined> | null;
  message?: string;
};

export type FlatGqlError = { message: string };

/**
 * Turn `result.error` into `[{ message }]`, or an empty array when there is no
 * error.
 *
 * Empty array rather than undefined so callers can do `errors.length` without a
 * guard, and so "no error" is never confused with "an error with no message".
 */
export const toGqlErrorList = (error: unknown): FlatGqlError[] => {
  if (error === null || error === undefined) return [];

  const e = error as ApolloErrorLike;

  // CombinedGraphQLErrors: the individual server errors are the useful part.
  // Its own `.message` is those same messages joined by newlines, so preferring
  // the array avoids duplicating them.
  if (Array.isArray(e.errors)) {
    const flattened = e.errors
      .map((inner) => inner?.message)
      .filter((m): m is string => Boolean(m && m.trim()))
      .map((message) => ({ message }));

    // A CombinedGraphQLErrors whose inner messages are all blank still means
    // something failed - fall through to its own message rather than reporting
    // no error at all.
    if (flattened.length > 0) return flattened;
  }

  if (typeof e.message === "string" && e.message.trim()) {
    return [{ message: e.message }];
  }

  if (typeof error === "string" && error.trim()) return [{ message: error }];

  // Something was thrown, and it can describe itself no better than this. Still
  // an error - returning [] here would restore the silent-success bug.
  return [{ message: "Unknown GraphQL error" }];
};
