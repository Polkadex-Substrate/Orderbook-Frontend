import {
  ORIGIN_UNKNOWN,
  normaliseOrigin,
  originMismatch,
  resolveAppOrigin,
} from "./appOrigin";

/*
 * Jest globals, matching the rest of this app.
 *
 * The first block is the reported bug: a testnet build with no
 * NEXT_PUBLIC_APP_URL must never claim to be the mainnet origin.
 */

describe("resolveAppOrigin - the reported bug (ORDERBOOK-TESTNET-2)", () => {
  it("prefers the browser's own origin over the env value", () => {
    // The browser's answer is what Reown will actually see, so it wins even when
    // the env var says something else. This is the whole fix.
    expect(
      resolveAppOrigin(
        "https://testnet.polkadex.ee",
        "https://orderbook.polkadex.ee"
      )
    ).toBe("https://testnet.polkadex.ee");
  });

  it("never invents the mainnet origin when the env var is missing", () => {
    // The old code fell back to a hardcoded mainnet URL, so a testnet build with
    // no NEXT_PUBLIC_APP_URL declared itself to be mainnet and Reown rejected it.
    // That URL was also on a domain the company no longer owns, which is why the
    // fix returns "" rather than any hardcoded product URL.
    for (const missing of [undefined, null, "", "   "]) {
      expect(resolveAppOrigin(undefined, missing)).toBe(ORIGIN_UNKNOWN);
    }
  });

  it("falls back to the env value during server render, where there is no window", () => {
    expect(resolveAppOrigin(undefined, "https://testnet.polkadex.ee")).toBe(
      "https://testnet.polkadex.ee"
    );
  });
});

describe("normaliseOrigin", () => {
  it("strips a trailing slash", () => {
    // Reown reported the source WITH a trailing slash; origins carry none.
    expect(normaliseOrigin("https://testnet.polkadex.ee/")).toBe(
      "https://testnet.polkadex.ee"
    );
  });

  it("strips path, query and hash", () => {
    for (const v of [
      "https://testnet.polkadex.ee/trading/PDEXUSDT",
      "https://testnet.polkadex.ee/?a=1",
      "https://testnet.polkadex.ee/#x",
    ]) {
      expect({ in: v, out: normaliseOrigin(v) }).toEqual({
        in: v,
        out: "https://testnet.polkadex.ee",
      });
    }
  });

  it("keeps an explicit port, which is part of the origin", () => {
    expect(normaliseOrigin("http://localhost:3000/")).toBe(
      "http://localhost:3000"
    );
  });

  it("rejects a bare hostname rather than guessing a scheme", () => {
    // A bare hostname is a common allowlist mistake. Silently prefixing https://
    // would hide the misconfiguration instead of surfacing it.
    for (const v of ["testnet.polkadex.ee", "polkadex.ee"]) {
      expect({ in: v, out: normaliseOrigin(v) }).toEqual({ in: v, out: "" });
    }
  });

  it("rejects a websocket URL", () => {
    // POLKADEX_CHAIN sits a few lines away in the same env file, so a paste
    // error here is plausible. wss:// is not a web origin.
    expect(normaliseOrigin("wss://polkadex-testnet.polkadex.ee")).toBe("");
  });

  it("rejects non-strings and junk", () => {
    for (const v of [undefined, null, 42, {}, [], "not a url", "://"]) {
      expect({ in: String(v), out: normaliseOrigin(v as string) }).toEqual({
        in: String(v),
        out: "",
      });
    }
  });
});

describe("originMismatch", () => {
  it("flags a build whose env origin differs from the live origin", () => {
    // This is the signal that a deployment was built with the wrong
    // NEXT_PUBLIC_APP_URL - which makes every build-time inlined URL suspect.
    expect(
      originMismatch(
        "https://testnet.polkadex.ee",
        "https://orderbook.polkadex.ee"
      )
    ).toBe(true);
  });

  it("does not flag a match, including across trailing-slash forms", () => {
    expect(
      originMismatch(
        "https://testnet.polkadex.ee",
        "https://testnet.polkadex.ee/"
      )
    ).toBe(false);
  });

  it("does not flag when either side is unknown", () => {
    // Absent is not a mismatch; resolveAppOrigin handles absence.
    expect(originMismatch(undefined, "https://testnet.polkadex.ee")).toBe(
      false
    );
    expect(originMismatch("https://testnet.polkadex.ee", undefined)).toBe(
      false
    );
  });
});
