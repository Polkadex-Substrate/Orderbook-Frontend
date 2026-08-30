import { releaseDisagrees, resolveRelease } from "./sentryRelease";

/*
 * Ground truth, sampled from ten ORDERBOOK-TESTNET-R events: eight carried no
 * release at all, one carried the plugin's raw 40-character git SHA, and one
 * carried "3.8.0-production-8e9556b55", which is not our format at all. The
 * deploy stamp for every one of those builds was `0.1.0-<sha>`.
 */

const BUILD_ID = "0.1.0-651e8fd0";
const FOREIGN = "3.8.0-production-8e9556b55";

describe("resolveRelease - NEXT_BUILD_ID wins", () => {
  it("prefers the build id over anything the environment exports", () => {
    // The 14 Aug incident: something in the deploy environment exports a
    // SENTRY_RELEASE that is not this application's version, it won, and every
    // event was tagged with an identity matching no build we ship.
    expect(resolveRelease(BUILD_ID, FOREIGN)).toBe(BUILD_ID);
  });

  it("falls back to SENTRY_RELEASE when the build id is absent", () => {
    // Local dev, or a build that genuinely did not receive the arg. A real
    // value beats no value.
    expect(resolveRelease(undefined, FOREIGN)).toBe(FOREIGN);
  });

  it("returns undefined when neither is set, rather than inventing one", () => {
    // An absent release is visibly absent in Sentry's filter. A placeholder
    // like "unknown" looks like a real build nobody can find.
    expect(resolveRelease(undefined, undefined)).toBeUndefined();
    expect(resolveRelease(null, null)).toBeUndefined();
  });

  it("treats empty and whitespace-only as unset", () => {
    // `NEXT_BUILD_ID=` in an env file is the classic way to set a variable to
    // nothing while appearing to set it. Number("") is 0 and "" is falsy, but
    // "  " is truthy - which would tag every event with a blank string.
    expect(resolveRelease("", FOREIGN)).toBe(FOREIGN);
    expect(resolveRelease("   ", FOREIGN)).toBe(FOREIGN);
    expect(resolveRelease("", "")).toBeUndefined();
    expect(resolveRelease("  ", "  ")).toBeUndefined();
  });

  it("trims, so a stray newline from a file read does not become the tag", () => {
    expect(resolveRelease(`${BUILD_ID}\n`)).toBe(BUILD_ID);
  });
});

describe("releaseDisagrees - warn only when it means something", () => {
  it("flags two different values that are both set", () => {
    expect(releaseDisagrees(BUILD_ID, FOREIGN)).toBe(true);
  });

  it("is quiet when they agree", () => {
    expect(releaseDisagrees(BUILD_ID, BUILD_ID)).toBe(false);
  });

  it("is quiet when only one is set", () => {
    // Not a disagreement. This is the normal local-dev case and warning about
    // it would train everyone to ignore the warning.
    expect(releaseDisagrees(BUILD_ID, undefined)).toBe(false);
    expect(releaseDisagrees(undefined, FOREIGN)).toBe(false);
  });

  it("is quiet when neither is set", () => {
    expect(releaseDisagrees(undefined, undefined)).toBe(false);
    expect(releaseDisagrees("", "")).toBe(false);
  });
});
