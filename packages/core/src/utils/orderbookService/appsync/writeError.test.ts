import { describeWriteError } from "./writeError";

/*
 * The invariant these tests exist to protect: describeWriteError ALWAYS returns a
 * non-empty string. Every write in writeStrategy now does
 *
 *   throw new Error(describeWriteError(error))
 *
 * so if this ever returned "" the throw would still happen but carry no
 * explanation - and the previous behaviour (silently swallowing the failure and
 * reporting success) is what this replaced.
 */

describe("describeWriteError", () => {
  it("prefers GraphQL error messages, joined", () => {
    expect(
      describeWriteError({
        errors: [{ message: "insufficient balance" }, { message: "try later" }],
      })
    ).toBe("insufficient balance; try later");
  });

  it("recovers a plain Error message - THE case that used to be swallowed", () => {
    // writeStrategy throws `new Error(resp.body)` when the engine reports
    // is_success: false. A plain Error has no `.errors`, so the old catch let it
    // vanish and the call resolved as success.
    expect(
      describeWriteError(new Error("Order rejected: price out of band"))
    ).toBe("Order rejected: price out of band");
  });

  it("recovers the strategy's own 'no valid response' throw", () => {
    expect(
      describeWriteError(
        new Error("Place order failed: No valid response from server")
      )
    ).toMatch(/No valid response from server/);
  });

  it("handles a thrown string", () => {
    expect(describeWriteError("something broke")).toBe("something broke");
  });

  it("handles an object carrying only a message", () => {
    expect(describeWriteError({ message: "not an Error instance" })).toBe(
      "not an Error instance"
    );
  });

  it("NEVER returns an empty string, for any input", () => {
    const inputs: unknown[] = [
      undefined,
      null,
      "",
      "   ",
      0,
      false,
      {},
      [],
      new Error(""),
      new Error("   "),
      { errors: [] },
      { errors: null },
      { errors: [{}] },
      { errors: [{ message: "" }] },
      { errors: [{ message: "  " }] },
      { message: "" },
      { message: "   " },
    ];
    for (const input of inputs) {
      const out = describeWriteError(input);
      expect(typeof out).toBe("string");
      expect(out.trim().length).toBeGreaterThan(0);
    }
  });

  it("uses the caller's fallback when there is nothing to report", () => {
    expect(describeWriteError({}, "Cancel failed: no response")).toBe(
      "Cancel failed: no response"
    );
    // And the fallback must not mask a real message.
    expect(
      describeWriteError(new Error("real reason"), "Cancel failed: no response")
    ).toBe("real reason");
  });

  it("drops blank GraphQL messages rather than emitting stray separators", () => {
    // The old code appended ":" per error unconditionally, producing "::" for
    // blank messages.
    const out = describeWriteError({
      errors: [{ message: "" }, { message: "real" }, { message: "   " }],
    });
    expect(out).toBe("real");
    expect(out).not.toMatch(/;;|::/);
  });

  it("prefers GraphQL errors over an Error's own message", () => {
    // An ApolloError carries both; the server's reason is the useful one.
    const apolloish = Object.assign(new Error("Response not successful"), {
      errors: [{ message: "trade account not registered" }],
    });
    expect(describeWriteError(apolloish)).toBe("trade account not registered");
  });
});
