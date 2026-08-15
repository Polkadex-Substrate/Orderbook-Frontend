import { errorCopy, isChunkLoadError } from "./errorRecovery";

/*
 * Jest globals, matching the rest of this app.
 *
 * The risk being tested is asymmetric. Failing to recognise a chunk error costs
 * the user one manual reload. Recognising an ORDINARY error as a chunk error
 * costs them an infinite reload loop and destroys the console they would need to
 * report it. So the matcher is tested hardest on what it must NOT match.
 */

/** The real error, verbatim from testnet after the 2026-08-14 22:40 deploy. */
const REAL = Object.assign(
  new Error(
    "Loading chunk 1370 failed.\n(error: https://testnet.polkadex.ee/_next/" +
      "static/chunks/app/trading/%5Bid%5D/page-66aef840a394f5ae.js)"
  ),
  { name: "ChunkLoadError" }
);

describe("isChunkLoadError - the reported failure", () => {
  it("recognises the actual error seen on testnet", () => {
    expect(isChunkLoadError(REAL)).toBe(true);
  });

  it("recognises it by name even when the message is unhelpful", () => {
    expect(
      isChunkLoadError(Object.assign(new Error(""), { name: "ChunkLoadError" }))
    ).toBe(true);
  });

  it("recognises the other browsers' wording for the same situation", () => {
    // webpack, Safari and Firefox all phrase this differently. Matching only
    // Chrome's wording would leave Safari users, who are most of our reporters,
    // stuck on a dead page.
    const variants = [
      "Loading chunk 42 failed.",
      "Loading CSS chunk 7 failed.",
      "Failed to fetch dynamically imported module: https://x/y.js",
      "Importing a module script failed.",
    ];
    for (const message of variants) {
      expect({ message, ok: isChunkLoadError(new Error(message)) }).toEqual({
        message,
        ok: true,
      });
    }
  });
});

describe("isChunkLoadError - what it must NOT match", () => {
  it("ignores ordinary application errors", () => {
    // Every one of these is a real error seen in this project. Matching any of
    // them would convert a genuine bug into a reload loop.
    const others = [
      "undefined is not an object (evaluating 's.baseAsset.ticker')",
      "Cannot read properties of undefined (reading 'toLowerCase')",
      "FATAL: Unable to initialize the API: No response received from RPC endpoint in 60s",
      "The source https://testnet.polkadex.ee/ has not been authorized yet",
      "Failed to connect to MetaMask",
      "Extension context invalidated.",
    ];
    for (const message of others) {
      expect({ message, ok: isChunkLoadError(new Error(message)) }).toEqual({
        message,
        ok: false,
      });
    }
  });

  it("survives junk instead of an error", () => {
    for (const v of [undefined, null, "", 0, {}, { message: 42 }, []]) {
      expect(() => isChunkLoadError(v)).not.toThrow();
      expect(isChunkLoadError(v)).toBe(false);
    }
  });

  it("does not match a message that merely mentions loading", () => {
    expect(isChunkLoadError(new Error("Error loading markets"))).toBe(false);
    expect(isChunkLoadError(new Error("chunk"))).toBe(false);
  });
});

describe("there is no automatic reload any more", () => {
  it("does not export a shouldAutoReload predicate", async () => {
    // The automatic reload turned a visible dead end into an unresponsive page:
    // the effect that performed it was keyed on `[error]` and also set state, so
    // a fresh error identity per render produced an infinite render loop. It hung
    // exactly once per deployment on a cached page, which is precisely when this
    // boundary is reached.
    //
    // Asserting the ABSENCE of the export is the regression guard. Anyone wiring
    // an automatic reload back in has to delete this test first, and will read
    // why while doing so.
    const mod = await import("./errorRecovery");
    expect("shouldAutoReload" in mod).toBe(false);
  });
});

describe("errorCopy - say which situation this is", () => {
  it("frames a first chunk failure as a new version, not a fault", () => {
    const copy = errorCopy(REAL, false);
    expect(copy.title.toLowerCase()).toContain("new version");
    expect(copy.title.toLowerCase()).not.toContain("wrong");
  });

  it("does not promise a reload that no longer happens on its own", () => {
    // The old copy said "Reloading now." while an effect navigated. Nothing
    // navigates without a click now, so saying so would be false.
    const copy = errorCopy(REAL, false);
    expect(copy.detail.toLowerCase()).not.toContain("reloading now");
  });

  it("stops claiming it is an update once reloading has failed", () => {
    // Saying "reloading now" a second time, having already reloaded, is a lie
    // the user can see through.
    const copy = errorCopy(REAL, true);
    expect(copy.detail.toLowerCase()).toContain("did not help");
    expect(copy.title.toLowerCase()).not.toContain("new version");
  });

  it("does not call an application error an update", () => {
    const copy = errorCopy(new Error("boom"), false);
    expect(copy.title).toBe("Something went wrong");
    expect(copy.detail.toLowerCase()).not.toContain("new version");
  });

  it("always offers an action and never leaves a dead end", () => {
    for (const [err, tried] of [
      [REAL, false],
      [REAL, true],
      [new Error("boom"), false],
      [undefined, false],
    ] as const) {
      const copy = errorCopy(err, tried);
      expect(copy.action.length).toBeGreaterThan(0);
      expect(copy.detail.length).toBeGreaterThan(0);
    }
  });
});
