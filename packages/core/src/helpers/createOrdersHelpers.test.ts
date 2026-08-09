import { createOrderPayload } from "./createOrdersHelpers";
import { formatNumber } from "./Utils";

/*
 * Ground truth: POLKADEX-ORDERBOOK-FE-TEST-9, "Cannot read properties of
 * undefined (reading 'toString')" - an UNHANDLED REJECTION out of an async
 * onSubmit on /trading/WBTCUSDT. 29 events in three minutes from one user:
 * someone retrying a button that failed silently, because a TypeError thrown
 * from a helper reaches no error message anywhere in the UI.
 */

const base = {
  tradeAddress: "5Grw...",
  side: "Bid" as const,
  baseAsset: "1",
  quoteAsset: "2",
  mainAddress: "5Grw...",
};

describe("formatNumber", () => {
  it("is total - the declared type says string, reality sends undefined", () => {
    // A MARKET order carries no price and the caller passed it straight
    // through, so `value.replace` ran on undefined.
    expect(() => formatNumber(undefined)).not.toThrow();
    expect(() => formatNumber(null)).not.toThrow();
    expect(formatNumber(undefined)).toBe("");
    expect(formatNumber(null)).toBe("");
  });

  it("still trims trailing zeros as before", () => {
    expect(formatNumber("1.2300")).toBe("1.23");
    expect(formatNumber("5.000")).toBe("5");
    expect(formatNumber("42")).toBe("42");
  });

  it("accepts numbers as well as strings", () => {
    expect(formatNumber(1.23)).toBe("1.23");
    expect(formatNumber(0)).toBe("0");
  });
});

describe("createOrderPayload - refusing by name", () => {
  it("builds a valid limit order", () => {
    const p = createOrderPayload({
      ...base,
      type: "LIMIT",
      quantity: "1.5",
      price: "100",
    });
    expect(p.qty).toBe("1.5");
    expect(p.price).toBe("100");
    expect(p.pair).toBe("1-2");
  });

  it("THE bug: a missing quantity throws a NAMED error, not a TypeError", () => {
    // Previously `quantity.toString()` - an unreadable TypeError from a helper,
    // escaping as an unhandled rejection with nothing shown to the user.
    for (const quantity of [undefined, null, ""]) {
      expect(() =>
        createOrderPayload({
          ...base,
          type: "LIMIT",
          quantity: quantity as never,
          price: "100",
        })
      ).toThrow(/without a quantity/);
    }
  });

  it("a limit order without a price throws a named error", () => {
    expect(() =>
      createOrderPayload({
        ...base,
        type: "LIMIT",
        quantity: "1",
        price: undefined,
      })
    ).toThrow(/without a price/);
  });

  it("a MARKET order needs no price and must still build", () => {
    // The legitimate case that made `price` nullable in the first place.
    const p = createOrderPayload({
      ...base,
      type: "MARKET",
      quantity: "1",
      price: undefined,
    });
    expect(p.price).toBe("0");
  });

  it("a market BID prices in the quote asset, leaving qty zero", () => {
    const p = createOrderPayload({
      ...base,
      type: "MARKET",
      side: "Bid",
      quantity: "250",
      price: undefined,
    });
    expect(p.qty).toBe("0");
    expect(p.quote_order_quantity).toBe("250");
  });

  it("never throws a TypeError for any absent field", () => {
    // The property that matters: whatever is missing, the failure is legible.
    const cases: Record<string, unknown>[] = [
      { type: undefined, quantity: "1", price: "1" },
      { type: "LIMIT", quantity: undefined, price: "1" },
      { type: "LIMIT", quantity: "1", price: undefined },
      { type: "LIMIT", quantity: "1", price: "1", side: undefined },
    ];
    for (const args of cases) {
      try {
        createOrderPayload({ ...base, ...args } as never);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
        expect(e).not.toBeInstanceOf(TypeError);
        expect((e as Error).message).toMatch(
          /Cannot place an order|limit order/
        );
      }
    }
  });
});
