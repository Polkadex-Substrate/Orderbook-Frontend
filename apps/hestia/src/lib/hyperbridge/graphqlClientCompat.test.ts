import { GraphQLClient } from "graphql-request";

/*
 * Does the graphql-request version we FORCE actually satisfy the API the
 * Hyperbridge SDK uses?
 *
 * Every `yarn install` prints:
 *
 *   warning Resolution field "graphql-request@5.1.0" is incompatible with
 *   requested version "graphql-request@^7.1.2"
 *
 * @aksumite/subscan pins 5.1.0 exactly, @hyperbridge/sdk asks for ^7.1.2, and
 * the root resolution gives everyone 5.1.0 - so the bridge SDK runs two majors
 * below what it declares. That warning is alarming and, on inspection, benign:
 * the SDK's entire usage is `new GraphQLClient(url)` plus positional
 * `.request(document, variables)`, and that surface is unchanged from v5 to v7.
 *
 * This file is the evidence, kept executable so it cannot rot into folklore.
 *
 * A planted-failure check found that 5.1.0 accepts the v6+ OBJECT form
 * `request({ document, variables })` as well as the positional one - its
 * parameter is literally named `documentOrOptions`. So the compatibility margin
 * is wider than the version numbers suggest, and a guard asserting "the object
 * form must fail here" would be asserting something false. Both forms are
 * asserted below instead. What this suite catches is a future resolution
 * landing on a version that drops either form, or changes what `request`
 * returns - which is how this skew would actually bite.
 *
 * No network: fetch is stubbed, so this asserts the CALL SHAPE the SDK relies
 * on, which is the only thing the version skew could break.
 */

type FetchCall = { url: string; body: Record<string, unknown> };

const stubFetch = (calls: FetchCall[], payload: unknown = { ok: true }) =>
  ((url: string, init: { body?: string }) => {
    calls.push({ url, body: JSON.parse(init?.body ?? "{}") });
    return Promise.resolve({
      ok: true,
      status: 200,
      // `forEach` has to actually yield content-type, not just exist. v5 copies
      // headers into a plain object via forEach and reads the content type from
      // THAT copy - a stub whose forEach is a no-op looks like a response with
      // no content type, so the client takes the text() path and every call
      // fails as a ClientError. Cost me a red suite that had nothing to do with
      // the library.
      headers: {
        forEach: (emit: (value: string, key: string) => void) =>
          emit("application/json", "content-type"),
        get: () => "application/json",
      },
      json: () => Promise.resolve({ data: payload }),
      text: () => Promise.resolve(JSON.stringify({ data: payload })),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;

const QUERY = `query Status($commitment: String!) {
  request(commitment: $commitment) { status }
}`;

describe("graphql-request compatibility with @hyperbridge/sdk's usage", () => {
  it("exposes the two things the SDK imports and calls", () => {
    // The SDK does exactly: import { GraphQLClient } ... new GraphQLClient(url)
    expect(typeof GraphQLClient).toBe("function");
    expect(typeof GraphQLClient.prototype.request).toBe("function");
  });

  it("accepts POSITIONAL request(document, variables) - the form the SDK uses", async () => {
    // All 11 of the SDK's graphql calls are positional. v5 supports this and so
    // does v7; it is the reason the version skew does not bite. If a future
    // resolution lands on a version that requires the object form, this throws.
    const calls: FetchCall[] = [];
    const client = new GraphQLClient("https://example.invalid/graphql", {
      fetch: stubFetch(calls),
    });

    await client.request(QUERY, { commitment: "0xabc" });

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://example.invalid/graphql");
    expect(calls[0].body.query).toContain("query Status");
    expect(calls[0].body.variables).toEqual({ commitment: "0xabc" });
  });

  it("returns the data payload unwrapped, as the SDK expects", async () => {
    // The SDK reads response.assetTeleportedV2 etc. straight off the result, so
    // request() must return `data`, not the whole envelope. That contract is
    // identical in v5 and v7 - assert it rather than assume it.
    const calls: FetchCall[] = [];
    const client = new GraphQLClient("https://example.invalid/graphql", {
      fetch: stubFetch(calls, { assetTeleportedV2: { id: "1" } }),
    });

    const result = await client.request<{ assetTeleportedV2: { id: string } }>(
      QUERY,
      { commitment: "0xabc" }
    );

    expect(result).toEqual({ assetTeleportedV2: { id: "1" } });
    expect(result).not.toHaveProperty("data");
  });

  it("also accepts the v6+ object form, so the skew has margin either way", async () => {
    // Found by planting a failure: this was expected to break on 5.1.0 and did
    // not. `request`'s parameter is `documentOrOptions`, so both call styles
    // work. Asserted rather than assumed, because it is the reason a future
    // SDK refactor to the object form would not be a breaking event.
    const calls: FetchCall[] = [];
    const client = new GraphQLClient("https://example.invalid/graphql", {
      fetch: stubFetch(calls),
    });

    await client.request({
      document: QUERY,
      variables: { commitment: "0xabc" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    expect(calls[0].body.variables).toEqual({ commitment: "0xabc" });
  });

  it("sends no variables key rather than an empty object when none are given", async () => {
    const calls: FetchCall[] = [];
    const client = new GraphQLClient("https://example.invalid/graphql", {
      fetch: stubFetch(calls),
    });

    await client.request(QUERY);

    expect(calls[0].body.query).toContain("query Status");
    expect(calls[0].body.variables).toBeUndefined();
  });
});
