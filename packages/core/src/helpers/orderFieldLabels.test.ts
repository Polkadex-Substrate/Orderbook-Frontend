import {
  UNKNOWN_LABEL,
  isUnusableOrderField,
  marketNameLabel,
  orderFieldLabel,
} from "./orderFieldLabels";

/*
 * Jest globals, matching the rest of this package.
 *
 * The first block is the reported crash. Everything after it is the guard
 * against over-correcting into "renders a dash for everything".
 */

const label = (value: unknown) => ({
  input: String(value),
  out: orderFieldLabel(value),
});

describe("orderFieldLabel - the reported crash", () => {
  it("does not throw on undefined, which is what the mapper produced", () => {
    // ORDERBOOK-TESTNET-6: e.getValue().type was undefined because the
    // websocket mapper does `item.order_type as OrderType` on a payload that
    // did not carry the field.
    expect(() => orderFieldLabel(undefined)).not.toThrow();
    expect(orderFieldLabel(undefined)).toBe(UNKNOWN_LABEL);
  });

  it("does not throw on any of the shapes a bad payload can produce", () => {
    for (const v of [undefined, null, {}, [], true, Symbol("x"), () => 1]) {
      expect(() => orderFieldLabel(v)).not.toThrow();
      expect(orderFieldLabel(v)).toBe(UNKNOWN_LABEL);
    }
  });

  it("shows a dash rather than inventing a plausible order type", () => {
    // Defaulting to "limit" would put a specific, wrong fact on a screen people
    // use to decide what to trade.
    expect(orderFieldLabel(undefined)).toBe("-");
    expect(orderFieldLabel(undefined)).not.toBe("limit");
    expect(orderFieldLabel(undefined)).not.toBe("market");
  });
});

describe("orderFieldLabel - it still renders real values", () => {
  it("lowercases the order types", () => {
    expect(label("LIMIT")).toEqual({ input: "LIMIT", out: "limit" });
    expect(label("MARKET")).toEqual({ input: "MARKET", out: "market" });
  });

  it("lowercases the order statuses", () => {
    for (const [raw, want] of [
      ["OPEN", "open"],
      ["CLOSED", "closed"],
      ["CANCELLED", "cancelled"],
    ]) {
      expect(label(raw)).toEqual({ input: raw, out: want });
    }
  });

  it("trims surrounding whitespace", () => {
    expect(orderFieldLabel("  LIMIT  ")).toBe("limit");
  });

  it("treats a blank or whitespace-only string as missing", () => {
    // An empty string would render as nothing at all, which looks like a
    // layout bug rather than absent data.
    for (const v of ["", "   ", "\t", "\n"]) {
      expect(label(v)).toEqual({ input: v, out: UNKNOWN_LABEL });
    }
  });

  it("passes a finite number through", () => {
    expect(orderFieldLabel(0)).toBe("0");
    expect(orderFieldLabel(42)).toBe("42");
  });

  it("treats a non-finite number as missing", () => {
    for (const v of [NaN, Infinity, -Infinity]) {
      expect(label(v)).toEqual({ input: String(v), out: UNKNOWN_LABEL });
    }
  });

  it("accepts a caller-supplied fallback", () => {
    expect(orderFieldLabel(undefined, "unknown")).toBe("unknown");
  });
});

describe("isUnusableOrderField", () => {
  it("is true exactly when the fallback is being shown", () => {
    expect(isUnusableOrderField(undefined)).toBe(true);
    expect(isUnusableOrderField(null)).toBe(true);
    expect(isUnusableOrderField("")).toBe(true);
  });

  it("is false for real values", () => {
    for (const v of ["LIMIT", "MARKET", "OPEN", 0]) {
      expect({ v: String(v), unusable: isUnusableOrderField(v) }).toEqual({
        v: String(v),
        unusable: false,
      });
    }
  });
});

describe("marketNameLabel", () => {
  it("survives the mapper's empty-object market fallback", () => {
    // The mapper does `market || ({} as MarketBase)`, so name is undefined
    // whenever the market id is not in the loaded list.
    expect(() => marketNameLabel({})).not.toThrow();
    expect(marketNameLabel({})).toBe(UNKNOWN_LABEL);
  });

  it("survives a null or undefined market", () => {
    expect(marketNameLabel(null)).toBe(UNKNOWN_LABEL);
    expect(marketNameLabel(undefined)).toBe(UNKNOWN_LABEL);
  });

  it("returns a real name unchanged, preserving case", () => {
    // Market names are shown as-is; only type and status are lowercased.
    expect(marketNameLabel({ name: "LINK/USDT" })).toBe("LINK/USDT");
  });

  it("treats a blank name as missing", () => {
    expect(marketNameLabel({ name: "   " })).toBe(UNKNOWN_LABEL);
    expect(marketNameLabel({ name: null })).toBe(UNKNOWN_LABEL);
  });
});
