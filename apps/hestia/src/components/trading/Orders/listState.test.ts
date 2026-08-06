import { resolveListState } from "./listState";

/*
 * The ordering assertions here are the regression guard. Every one of these
 * previously resolved to "empty", because the components checked count before
 * isError and React Query hands back initialData: [] on failure.
 */

describe("resolveListState", () => {
  it("reports failure when the read errored, even though the list is empty", () => {
    // THE bug. A failed read has count 0, so an emptiness-first check claimed
    // the user had no orders - about orders they had just placed.
    expect(
      resolveListState({ isLoading: false, isError: true, count: 0 })
    ).toBe("failed");
  });

  it("still reports failure when stale rows are present", () => {
    // A refetch can fail while the previous page is still cached. Showing the
    // stale rows as if current is worse than saying the read failed.
    expect(
      resolveListState({ isLoading: false, isError: true, count: 5 })
    ).toBe("failed");
  });

  it("reports empty only when the read SUCCEEDED with nothing", () => {
    expect(
      resolveListState({ isLoading: false, isError: false, count: 0 })
    ).toBe("empty");
  });

  it("reports ready when there is data", () => {
    expect(
      resolveListState({ isLoading: false, isError: false, count: 1 })
    ).toBe("ready");
    expect(
      resolveListState({ isLoading: false, isError: false, count: 250 })
    ).toBe("ready");
  });

  it("loading outranks everything, including an error being retried", () => {
    // React Query keeps isError true across a retry; flashing the error state
    // between attempts reads as a hard failure when it is not.
    expect(resolveListState({ isLoading: true, isError: true, count: 0 })).toBe(
      "loading"
    );
    expect(
      resolveListState({ isLoading: true, isError: false, count: 0 })
    ).toBe("loading");
    expect(resolveListState({ isLoading: true, isError: true, count: 3 })).toBe(
      "loading"
    );
  });

  it("never reports empty while an error is present", () => {
    // Exhaustive over the states that can coexist - this is the invariant, not
    // the individual cases.
    for (const count of [0, 1, 99]) {
      expect(
        resolveListState({ isLoading: false, isError: true, count })
      ).not.toBe("empty");
    }
  });

  it("never reports ready when the read failed", () => {
    for (const count of [0, 1, 99]) {
      expect(
        resolveListState({ isLoading: false, isError: true, count })
      ).not.toBe("ready");
    }
  });
});
