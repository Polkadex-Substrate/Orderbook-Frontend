import { toGqlErrorList } from "./apolloErrors";

/*
 * The invariant: an error in produces at least one message out, and NO error in
 * produces an empty array. Getting that backwards is what let a refused order
 * report success.
 */

describe("toGqlErrorList", () => {
  it("returns [] when there is no error", () => {
    expect(toGqlErrorList(undefined)).toEqual([]);
    expect(toGqlErrorList(null)).toEqual([]);
  });

  it("flattens a CombinedGraphQLErrors-shaped error", () => {
    // Apollo 4 shape: an Error subclass carrying the server's error array.
    const combined = Object.assign(
      new Error("trade account not registered\nprice out of band"),
      {
        errors: [
          { message: "trade account not registered" },
          { message: "price out of band" },
        ],
      }
    );
    expect(toGqlErrorList(combined)).toEqual([
      { message: "trade account not registered" },
      { message: "price out of band" },
    ]);
  });

  it("prefers the inner array over the wrapper's joined message", () => {
    // The wrapper's own message is the inner ones joined by newlines; reporting
    // both would duplicate every message in the UI.
    const combined = Object.assign(new Error("a\nb"), {
      errors: [{ message: "a" }, { message: "b" }],
    });
    expect(toGqlErrorList(combined)).toHaveLength(2);
  });

  it("falls back to the wrapper message when inner messages are all blank", () => {
    // Still a failure. Returning [] here would mean "no error" and restore the
    // silent-success bug.
    const combined = Object.assign(new Error("something went wrong"), {
      errors: [{ message: "" }, {}, { message: "   " }],
    });
    expect(toGqlErrorList(combined)).toEqual([
      { message: "something went wrong" },
    ]);
  });

  it("handles a plain Error", () => {
    expect(toGqlErrorList(new Error("network down"))).toEqual([
      { message: "network down" },
    ]);
  });

  it("handles a thrown string", () => {
    expect(toGqlErrorList("bare string failure")).toEqual([
      { message: "bare string failure" },
    ]);
  });

  it("never returns [] for something that IS an error", () => {
    // Anything truthy-but-undescribable must still count as a failure.
    for (const input of [{}, [], new Error(""), { errors: [] }, 42, true]) {
      expect(toGqlErrorList(input).length).toBeGreaterThan(0);
    }
  });

  it("distinguishes absent from unhelpful", () => {
    // The two ends of the contract, side by side - this pair is the whole point.
    expect(toGqlErrorList(undefined)).toHaveLength(0);
    expect(toGqlErrorList({})).toHaveLength(1);
  });

  it("every returned message is a non-empty string", () => {
    const inputs: unknown[] = [
      new Error("x"),
      { errors: [{ message: "y" }] },
      {},
      "z",
      { errors: [{ message: "" }], message: "fallback" },
    ];
    for (const input of inputs) {
      for (const { message } of toGqlErrorList(input)) {
        expect(typeof message).toBe("string");
        expect(message.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
