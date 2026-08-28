import { MAX_ERROR_MESSAGE, errorMessage } from "./errorMessage";

/*
 * Jest globals, matching the rest of this package.
 *
 * ORDERBOOK-TESTNET-N recorded the failure this fixes: `titleType: "undefined"`,
 * because `onError: (error: Error) => onHandleError(error.message)` was handed
 * something that was not an Error. The tester saw "Something went wrong" while
 * their console held the actual cause.
 *
 * So the first case is the exact shape an injected wallet throws.
 */

describe("the shape that lost the tester's error", () => {
  it("extracts a JSON-RPC style wallet rejection, code and all", () => {
    // Enkrypt's signer, verbatim from the report's console line.
    expect(
      errorMessage({ code: 8546, message: "type is not bytes: signer_signRaw" })
    ).toBe("8546: type is not bytes: signer_signRaw");
  });

  it("does not return undefined for it, which is what broke", () => {
    const thrown = { code: 8546, message: "type is not bytes: signer_signRaw" };
    // The old code did `(thrown as Error).message` - which happens to work
    // here - but the toast still received undefined for shapes WITHOUT a
    // top-level message. Both must produce a string, never undefined.
    expect(typeof errorMessage(thrown)).toBe("string");
    expect(typeof errorMessage({ code: 8546 })).toBe("string");
  });
});

describe("every throwable shape", () => {
  it("handles Errors", () => {
    expect(errorMessage(new Error("boom"))).toBe("boom");
  });

  it("falls back to an Error's name when its message is empty", () => {
    // "NotFoundError" beats silence - see ORDERBOOK-TESTNET-P, a DOM error
    // whose message can be long but whose name is always useful.
    const e = new Error("");
    e.name = "NotFoundError";
    expect(errorMessage(e)).toBe("NotFoundError");
  });

  it("handles plain strings", () => {
    expect(errorMessage("Rejected by user")).toBe("Rejected by user");
  });

  it("unwraps a nested error", () => {
    expect(errorMessage({ error: new Error("inner") })).toBe("inner");
  });

  it("reads the first GraphQL error message", () => {
    expect(
      errorMessage({ errors: [{ message: "Signature verification failed" }] })
    ).toBe("Signature verification failed");
  });

  it("stringifies primitives", () => {
    expect(errorMessage(42)).toBe("42");
    expect(errorMessage(false)).toBe("false");
  });
});

describe("what it must NEVER produce", () => {
  it("never returns [object Object]", () => {
    // Worse than an empty string, because it looks like a real message and
    // stops anyone looking further. This app shipped that once already.
    for (const value of [{}, { a: 1 }, { message: 42 }, { message: "   " }]) {
      expect(errorMessage(value)).not.toContain("[object");
    }
  });

  it("returns an empty string when there is genuinely nothing", () => {
    // Empty, NOT a baked-in fallback: the caller owns the fallback, and
    // conflating "we had nothing" with "the error said X" is how the original
    // bug hid.
    for (const value of [null, undefined, "", "   ", {}, { code: 1 }]) {
      expect(errorMessage(value)).toBe("");
    }
  });

  it("never throws, whatever it is handed", () => {
    const nasty = [
      Symbol("s"),
      () => undefined,
      new Proxy({}, { get: () => undefined }),
      {
        get message() {
          throw new Error("hostile getter");
        },
      },
    ];
    for (const value of nasty) {
      expect(() => errorMessage(value)).not.toThrow();
    }
  });

  it("truncates a runaway message rather than filling the screen", () => {
    const long = "x".repeat(5000);
    const out = errorMessage(new Error(long));
    expect(out.length).toBeLessThanOrEqual(MAX_ERROR_MESSAGE);
    expect(out.endsWith("…")).toBe(true);
  });
});
