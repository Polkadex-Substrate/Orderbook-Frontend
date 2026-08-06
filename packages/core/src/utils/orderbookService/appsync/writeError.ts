/**
 * Turn anything thrown by a write (place order, cancel, withdraw) into a message
 * worth showing, and guarantee there is always one.
 *
 * WHY THIS EXISTS
 * Every write in writeStrategy ended with this shape:
 *
 *   } catch (error) {
 *     const errors = (error as GraphQLResult).errors;
 *     if (errors && errors.length > 0) { ...throw a joined message... }
 *   }
 *
 * A plain Error has no `.errors` property, so the `if` was false for the
 * strategy's OWN failure paths - `throw new Error(resp.body)` when the engine
 * reported `is_success: false`, and `throw new Error("Place order failed: No
 * valid response from server")`. Both were caught and DISCARDED, the async
 * function resolved, and React Query ran `onSuccess`, which fires the
 * "Order Placed" notification and the "Order placed" alert.
 *
 * The result was a success message for an order that never existed, followed by
 * an empty order list - reported, understandably, as the list being broken.
 *
 * Compounding it: the Apollo client is configured with errorPolicy "all", so a
 * GraphQL error does not reject at all. It resolves with `data: null`, meaning
 * the `.errors`-on-a-rejection branch could essentially never fire either.
 *
 * Import-free so it can be unit tested on its own.
 */

/** The GraphQL-ish shape the old code hoped for on a rejection. */
type MaybeGraphQLError = {
  errors?: { message?: string }[] | null;
  message?: string;
};

/**
 * Always returns a non-empty string, so a caller can unconditionally do
 * `throw new Error(describeWriteError(e))` and never swallow a failure.
 */
export const describeWriteError = (
  error: unknown,
  fallback = "The request failed and the server gave no reason."
): string => {
  const e = error as MaybeGraphQLError | null | undefined;

  // Preferred: GraphQL errors, joined. Blank entries dropped so the result
  // cannot come out as "::" or a bare colon.
  const gql = (e?.errors ?? [])
    .map((x) => x?.message)
    .filter((m): m is string => Boolean(m && m.trim()));
  if (gql.length > 0) return gql.join("; ");

  // Next: a normal Error, which is what the strategy's own throws produce and
  // exactly what used to be lost.
  if (error instanceof Error && error.message.trim()) return error.message;

  // A thrown string, or an object with a message but not an Error instance.
  if (typeof error === "string" && error.trim()) return error;
  if (e?.message && e.message.trim()) return e.message;

  return fallback;
};
