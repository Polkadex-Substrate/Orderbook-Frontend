/**
 * Which state should a data-backed list render?
 *
 * WHY THIS IS A FUNCTION AND NOT AN if-CHAIN IN EACH COMPONENT
 * Both order lists get `initialData: []` from React Query, so a FAILED read and
 * an EMPTY result arrive looking identical - an array of length zero. Each
 * component checked emptiness first, which meant the error branch was
 * unreachable: a backend failure rendered "No open orders", and the screen
 * asserted that orders the user had just placed did not exist.
 *
 * The ordering below is the whole point, and it is the thing worth a test:
 * failure must be checked BEFORE emptiness, because failure also looks empty.
 */

export type ListState = "loading" | "failed" | "empty" | "ready";

export const resolveListState = ({
  isLoading,
  isError,
  count,
}: {
  isLoading: boolean;
  isError: boolean;
  count: number;
}): ListState => {
  // Loading wins: an in-flight refetch after an error should show the spinner
  // rather than flashing the error state, and React Query keeps isError true
  // while it retries.
  if (isLoading) return "loading";

  // BEFORE the emptiness check. Reversing these two lines restores the bug.
  if (isError) return "failed";

  if (!count) return "empty";

  return "ready";
};
