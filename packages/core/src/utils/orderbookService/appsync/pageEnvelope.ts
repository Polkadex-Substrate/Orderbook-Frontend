/**
 * Read one page out of a GraphQL list response.
 *
 * WHY THIS IS ITS OWN FILE
 * The paginator used to read `res.data[key].nextToken` directly. When the server
 * cannot resolve a field it returns that field as NULL and puts the reason in an
 * `errors` array - `data` is still present, per the GraphQL spec. So the
 * unguarded read threw
 *
 *   TypeError: Cannot read properties of null (reading 'nextToken')
 *
 * from inside a do/while loop, which is what the developer saw instead of the
 * server's actual complaint. Worse, upstream the failure surfaced as an empty
 * list, so the UI said "No open orders" about orders that existed.
 *
 * Extracted with NO imports so it can be unit tested directly: the module it
 * lives beside pulls in the Apollo transport, and the point of this logic is that
 * it is decidable from the response envelope alone.
 */

export type GqlPage<T> = { items?: T[] | null; nextToken?: string | null };

export type GqlEnvelope<T> = {
  data?: Record<string, GqlPage<T> | null | undefined> | null;
  errors?: { message?: string }[] | null;
};

/**
 * Collapse a GraphQL `errors` array into one human-readable line.
 *
 * Exported for its own tests: the fallback path (errors present but every
 * message empty) is easy to get wrong and produces the useless "returned no
 * data: " with nothing after the colon.
 */
export const describeGqlErrors = (
  errors: { message?: string }[] | null | undefined,
  key: string
): string => {
  const messages = (errors ?? [])
    .map((e) => e?.message)
    .filter((m): m is string => Boolean(m && m.trim()));

  return messages.length > 0
    ? messages.join("; ")
    : `the server returned no "${key}" field`;
};

/**
 * Return the page at `key`, or throw an Error naming the real cause.
 *
 * Throwing rather than returning an empty page is deliberate. React Query turns
 * a throw into `isError`, which is the signal the order list needs to say
 * "couldn't load" instead of "you have none". Returning `{items: []}` here would
 * restore exactly the bug this exists to prevent.
 */
export const readGqlPage = <T>(
  res: GqlEnvelope<T> | null | undefined,
  key: string
): { items: T[]; nextToken: string | null } => {
  const page = res?.data?.[key];

  if (page === null || page === undefined) {
    throw new Error(
      `GraphQL query "${key}" returned no data: ${describeGqlErrors(
        res?.errors,
        key
      )}`
    );
  }

  return {
    // A page that resolved with no items is legitimately empty - that is the
    // "you have no open orders" case, and it must NOT throw.
    items: page.items ?? [],
    nextToken: page.nextToken ?? null,
  };
};
