import {
  connectLabel,
  connectStep,
  sideLabel,
  sideTone,
} from "./connectAccount.logic";

/*
 * Jest globals, matching the rest of this app.
 *
 * The reported bug is that two panels look identical to a user who has not
 * connected anything. So the tests are written from that user's position: the
 * property that matters is that buy and sell are DISTINGUISHABLE in every state,
 * not that any individual string is correct.
 */

describe("the reported bug: buy and sell are indistinguishable when unfunded", () => {
  it("gives the two sides different labels", () => {
    // Previously both panels rendered the same grey "Connect Funding Account"
    // and nothing else, so this was the whole defect.
    expect(sideLabel("buy", "PDEX")).not.toBe(sideLabel("sell", "PDEX"));
  });

  it("gives the two sides different tones", () => {
    expect(sideTone("buy")).not.toBe(sideTone("sell"));
  });

  it("stays distinguishable at every connection step", () => {
    // The label must not depend on connection state, or the bug returns in
    // whichever state was overlooked.
    const steps = ["fund", "funding-account", "trading-account"] as const;
    for (const step of steps) {
      expect({
        step,
        distinct: sideLabel("buy", "PDEX") !== sideLabel("sell", "PDEX"),
        button: connectLabel(step).length > 0,
      }).toEqual({ step, distinct: true, button: true });
    }
  });

  it("stays distinguishable when the market has no usable ticker", () => {
    // An unresolved market renders its ticker as "-" elsewhere in the app.
    for (const ticker of [undefined, null, "", "   ", "-"]) {
      expect(sideLabel("buy", ticker)).not.toBe(sideLabel("sell", ticker));
    }
  });
});

describe("sideLabel", () => {
  it("names the asset when there is one", () => {
    expect(sideLabel("buy", "PDEX")).toBe("Buy PDEX");
    expect(sideLabel("sell", "USDT")).toBe("Sell USDT");
  });

  it("falls back to the bare verb rather than printing a placeholder", () => {
    // "Buy -" reads as a broken string; "Buy" reads as a category.
    for (const ticker of [undefined, null, "", "   ", "-"]) {
      expect({
        ticker: String(ticker),
        label: sideLabel("buy", ticker),
      }).toEqual({ ticker: String(ticker), label: "Buy" });
    }
  });

  it("trims incidental whitespace", () => {
    expect(sideLabel("sell", "  WBTC  ")).toBe("Sell WBTC");
  });

  it("returns null when there is no side, rather than guessing one", () => {
    // The mobile bar (responsiveInteraction.tsx) is ONE control for both
    // directions. Labelling it "Buy" would be a plain lie about what it does,
    // and defaulting to a side is how that lie gets introduced silently.
    for (const v of [undefined, null, "", "BUY", "long"]) {
      expect({ side: String(v), label: sideLabel(v as never, "PDEX") }).toEqual(
        {
          side: String(v),
          label: null,
        }
      );
    }
  });
});

describe("connectStep - the order of the checks is load-bearing", () => {
  it("asks for funding when the account exists but has no trading account", () => {
    // Checked FIRST. Otherwise this user is told to "Connect Funding Account",
    // which they already have, and the instruction is impossible to act on.
    expect(connectStep({ hasMainAddress: true, proxyCount: 0 })).toBe("fund");
  });

  it("asks to connect a funding account when there is no main address", () => {
    expect(connectStep({ hasMainAddress: false, proxyCount: 0 })).toBe(
      "funding-account"
    );
  });

  it("asks to connect a trading account once proxies exist", () => {
    expect(connectStep({ hasMainAddress: true, proxyCount: 2 })).toBe(
      "trading-account"
    );
  });

  it("covers the whole input space with no fallthrough", () => {
    const seen = new Set<string>();
    for (const hasMainAddress of [true, false]) {
      for (const proxyCount of [0, 1, 5]) {
        const step = connectStep({ hasMainAddress, proxyCount });
        expect(["fund", "funding-account", "trading-account"]).toContain(step);
        seen.add(step);
      }
    }
    // All three reachable; a step that can never be shown is dead UI.
    expect(seen.size).toBe(3);
  });
});

describe("connectLabel", () => {
  it("gives every step a distinct instruction", () => {
    const labels = (
      ["fund", "funding-account", "trading-account"] as const
    ).map(connectLabel);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("never returns an empty instruction", () => {
    for (const step of [
      "fund",
      "funding-account",
      "trading-account",
    ] as const) {
      expect(connectLabel(step).trim().length).toBeGreaterThan(0);
    }
  });
});
