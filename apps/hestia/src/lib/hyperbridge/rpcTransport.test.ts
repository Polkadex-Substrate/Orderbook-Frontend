import { parseRpcUrls, describeRpcError } from "./rpcTransport";

/*
 * A dead RPC provider took the whole bridge down (drpc: "chain is not available
 * on free plan"). These cover the parsing that lets one env value carry several
 * endpoints so that cannot happen again.
 */
describe("parseRpcUrls", () => {
  it("reads a single URL", () => {
    expect(parseRpcUrls("https://a.example")).toEqual(["https://a.example"]);
  });

  it("splits a comma-separated list and trims whitespace", () => {
    expect(
      parseRpcUrls("https://a.example, https://b.example ,https://c")
    ).toEqual(["https://a.example", "https://b.example", "https://c"]);
  });

  it("returns empty for unset/blank so the caller can use the chain default", () => {
    expect(parseRpcUrls(undefined)).toEqual([]);
    expect(parseRpcUrls("")).toEqual([]);
    expect(parseRpcUrls("   ")).toEqual([]);
    // A trailing comma is the likeliest hand-editing slip in an env file.
    expect(parseRpcUrls("https://a.example,")).toEqual(["https://a.example"]);
    expect(parseRpcUrls(",,")).toEqual([]);
  });

  it("preserves order - the first URL is the primary", () => {
    const urls = parseRpcUrls("https://primary,https://backup");
    expect(urls[0]).toBe("https://primary");
  });
});

describe("describeRpcError", () => {
  it("explains a rate limit without the viem dump", () => {
    const msg = describeRpcError(
      new Error("HTTP request failed. Status: 429 URL: https://rpc.example")
    );
    expect(msg).toMatch(/rate limit/i);
    // The reassurance matters most: users assume a failed bridge lost funds.
    expect(msg).toMatch(/nothing was submitted/i);
  });

  it("explains the provider paywall that actually broke bridging", () => {
    // Verbatim shape of the drpc failure.
    const msg = describeRpcError(
      new Error(
        'HTTP request failed. Status: 400 Details: {"message":"chain is not available on free plan, please upgrade to paid plan","code":35}'
      )
    );
    expect(msg).toMatch(/plan limit/i);
    expect(msg).toMatch(/nothing was submitted/i);
  });

  it("explains an unreachable endpoint", () => {
    expect(describeRpcError(new Error("fetch failed"))).toMatch(
      /could not reach/i
    );
  });

  it("returns null for unrelated errors so the real message survives", () => {
    // Replacing a specific error with a vague one is worse than the dump.
    expect(describeRpcError(new Error("User rejected the request"))).toBeNull();
    expect(
      describeRpcError(new Error("insufficient funds for gas"))
    ).toBeNull();
    expect(describeRpcError(undefined)).toBeNull();
    expect(describeRpcError(new Error(""))).toBeNull();
  });

  it("accepts a plain string as well as an Error", () => {
    expect(describeRpcError("Status: 429 too many requests")).toMatch(
      /rate limit/i
    );
  });
});

describe("describeRpcError does not over-match", () => {
  it("leaves gas and balance errors alone", () => {
    // "exceeded" used to be a rate-limit trigger, which would have told a user
    // with a gas problem to wait a minute and retry - wrong advice.
    expect(describeRpcError(new Error("gas limit exceeded"))).toBeNull();
    expect(
      describeRpcError(new Error("transfer amount exceeded balance"))
    ).toBeNull();
    expect(describeRpcError(new Error("intrinsic gas too low"))).toBeNull();
  });

  it("still catches the real rate-limit wordings", () => {
    for (const m of [
      "Status: 429",
      "too many requests",
      "rate limit reached",
      "rate-limited",
      "monthly quota exhausted",
      "request throttled",
    ]) {
      expect(describeRpcError(new Error(m))).toMatch(/rate limit/i);
    }
  });
});
