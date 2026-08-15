import {
  canonicalMarketPath,
  findMarketByBaseTicker,
  findMarketBySlug,
  marketKey,
  marketPath,
  marketSlug,
  resolveMarket,
} from "./marketSlug";

/*
 * Jest globals, matching the rest of this package.
 *
 * Real markets from testnet. `name` is composed by the market service as
 * `${baseAsset.ticker}/${quoteAsset.ticker}`; `id` is the asset-id pair, and its
 * hyphen is why ids are matched verbatim rather than normalised.
 */
const PDEX_USDT = { id: "PDEX-3496813586714279103", name: "PDEX/USDT" };
const WETH_USDT = { id: "123-231", name: "WETH/USDT" };
const USDC_USDT = { id: "456-231", name: "USDC/USDT" };
const MARKETS = [PDEX_USDT, WETH_USDT, USDC_USDT];

describe("marketSlug - the readable form", () => {
  it("turns PDEX/USDT into PDEX-USDT", () => {
    expect(marketSlug(PDEX_USDT)).toBe("PDEX-USDT");
    expect(marketPath(PDEX_USDT)).toBe("/trading/PDEX-USDT");
  });

  it("is idempotent, so a slug can be fed back in", () => {
    // marketSlug is applied to values that may already be slugs during
    // canonicalisation. If it were not idempotent the page would rewrite its
    // own URL forever.
    const once = marketSlug(PDEX_USDT);
    expect(marketSlug({ id: "x", name: once })).toBe(once);
  });

  it("collapses any run of separators and never leaves a dangling one", () => {
    for (const [name, expected] of [
      ["PDEX / USDT", "PDEX-USDT"],
      ["PDEX_USDT", "PDEX-USDT"],
      ["/PDEX/USDT/", "PDEX-USDT"],
      ["  PDEX/USDT  ", "PDEX-USDT"],
    ] as const) {
      expect({ name, slug: marketSlug({ id: "x", name }) }).toEqual({
        name,
        slug: expected,
      });
    }
  });

  it("survives a market with no usable name", () => {
    // The placeholder market exists precisely so the UI can render before data
    // arrives; it must not produce "/trading/undefined".
    for (const name of ["", "   ", "///"]) {
      expect(marketSlug({ id: "x", name })).toBe("");
    }
  });
});

describe("marketKey - one key per market, whatever the spelling", () => {
  it("collapses every spelling of one market to the same key", () => {
    const keys = ["PDEX/USDT", "PDEX-USDT", "pdexusdt", "PDEX_USDT"].map(
      marketKey
    );
    expect(new Set(keys).size).toBe(1);
    expect(keys[0]).toBe("PDEXUSDT");
  });

  it("does not confuse two different markets", () => {
    expect(marketKey("WETH/USDT")).not.toBe(marketKey("USDC/USDT"));
  });
});

describe("findMarketBySlug - the reported bug: silently loading another market", () => {
  it("does NOT fall back to the first market when nothing matches", () => {
    // The old helper ended in `?? markets[0]`, so /trading/NONSENSE loaded
    // PDEX/USDT and let the user trade it while the URL said otherwise.
    expect(findMarketBySlug(MARKETS, "NONSENSE")).toBeUndefined();
    expect(findMarketBySlug(MARKETS, "RETIRED-PAIR")).toBeUndefined();
  });

  it("does not match on a prefix", () => {
    // The old rule used `includes`, so "PDEX" matched "PDEX/USDT". A partial
    // identifier is not an identifier.
    expect(findMarketBySlug(MARKETS, "PDEX")).toBeUndefined();
    expect(findMarketBySlug(MARKETS, "USD")).toBeUndefined();
  });

  it("finds the market from the canonical slug", () => {
    expect(findMarketBySlug(MARKETS, "PDEX-USDT")).toBe(PDEX_USDT);
  });

  it("still finds it from the legacy jammed-together form", () => {
    // Every bookmark and shared link in existence uses this spelling.
    expect(findMarketBySlug(MARKETS, "PDEXUSDT")).toBe(PDEX_USDT);
    expect(findMarketBySlug(MARKETS, "WETHUSDT")).toBe(WETH_USDT);
  });

  it("accepts the service id verbatim, hyphen and all", () => {
    // Ids contain a hyphen too. Normalising them would strip it, so they are
    // compared before any normalisation happens.
    expect(findMarketBySlug(MARKETS, "123-231")).toBe(WETH_USDT);
    expect(findMarketBySlug(MARKETS, PDEX_USDT.id)).toBe(PDEX_USDT);
  });

  it("is case insensitive and separator insensitive", () => {
    for (const spelling of [
      "pdex-usdt",
      "PDEX/USDT",
      "pdex_usdt",
      "PdExUsDt",
    ]) {
      expect({ spelling, found: findMarketBySlug(MARKETS, spelling) }).toEqual({
        spelling,
        found: PDEX_USDT,
      });
    }
  });

  it("returns undefined rather than throwing on empty or missing input", () => {
    for (const markets of [undefined, null, []] as const) {
      expect(findMarketBySlug(markets, "PDEX-USDT")).toBeUndefined();
    }
    for (const id of [undefined, null, "", "///"] as const) {
      expect(findMarketBySlug(MARKETS, id)).toBeUndefined();
    }
  });
});

describe("findMarketByBaseTicker - /trading/PDEX, the balances Trade button", () => {
  it("resolves a lone base ticker to a market", () => {
    // The balances and open-orders tables link to /trading/<ticker>. That
    // worked only via the substring match that has just been removed, so this
    // case has to be supported deliberately or every Trade button 404s.
    expect(findMarketByBaseTicker(MARKETS, "PDEX")).toBe(PDEX_USDT);
    expect(findMarketByBaseTicker(MARKETS, "weth")).toBe(WETH_USDT);
  });

  it("still refuses a partial ticker", () => {
    // The distinction that matters: full base ticker, not any prefix. This is
    // what separates the new rule from the bug it replaces.
    for (const partial of ["PDE", "USD", "W", "ETH"]) {
      expect({
        partial,
        found: findMarketByBaseTicker(MARKETS, partial),
      }).toEqual({ partial, found: undefined });
    }
  });

  it("does not match a QUOTE ticker", () => {
    // USDT is the quote side of all three markets. "Trade USDT" has no obvious
    // meaning, and picking a market for it would be a guess.
    expect(findMarketByBaseTicker(MARKETS, "USDT")).toBeUndefined();
  });
});

describe("resolveMarket - everything the route accepts", () => {
  it("prefers a full pair over a base-ticker reading", () => {
    expect(resolveMarket(MARKETS, "WETH-USDT")).toBe(WETH_USDT);
    expect(resolveMarket(MARKETS, "WETHUSDT")).toBe(WETH_USDT);
  });

  it("falls through to the base ticker when no pair matches", () => {
    expect(resolveMarket(MARKETS, "PDEX")).toBe(PDEX_USDT);
  });

  it("still resolves nothing for an unknown identifier", () => {
    for (const id of ["NONSENSE", "PDE", "", null, undefined] as const) {
      expect({ id: String(id), found: resolveMarket(MARKETS, id) }).toEqual({
        id: String(id),
        found: undefined,
      });
    }
  });
});

describe("canonicalMarketPath - the redirect, and why it cannot loop", () => {
  it("asks for a rewrite when the URL uses the legacy form", () => {
    expect(canonicalMarketPath("PDEXUSDT", PDEX_USDT)).toBe(
      "/trading/PDEX-USDT"
    );
  });

  it("returns null once the URL is already canonical", () => {
    expect(canonicalMarketPath("PDEX-USDT", PDEX_USDT)).toBeNull();
  });

  it("returns null when fed its own output - the loop guard", () => {
    // The page navigates whenever this is non-null. Applying it to the result
    // of the navigation it just caused MUST be a fixed point, or the app
    // rewrites its URL forever. This is the property, not an example of it.
    const first = canonicalMarketPath("PDEXUSDT", PDEX_USDT);
    expect(first).not.toBeNull();
    const segment = String(first).split("/").pop();
    expect(canonicalMarketPath(segment, PDEX_USDT)).toBeNull();
  });

  it("returns null for an unknown market instead of guessing", () => {
    // An unrecognised pair must reach the not-found state. Redirecting it
    // somewhere plausible is how the old markets[0] fallback hid the problem.
    expect(canonicalMarketPath("NONSENSE", undefined)).toBeNull();
  });

  it("returns null when the market has no usable name", () => {
    expect(canonicalMarketPath("PDEXUSDT", { id: "x", name: "" })).toBeNull();
  });

  it("rewrites a lowercase or slashed spelling to the canonical one", () => {
    expect(canonicalMarketPath("pdexusdt", PDEX_USDT)).toBe(
      "/trading/PDEX-USDT"
    );
  });

  it("upgrades a bare-ticker URL to the full pair", () => {
    // /trading/PDEX is a legitimate entry point from the balances page, but it
    // is not a pair. After the rewrite the address bar names what is actually
    // being traded.
    expect(canonicalMarketPath("PDEX", PDEX_USDT)).toBe("/trading/PDEX-USDT");
  });
});
