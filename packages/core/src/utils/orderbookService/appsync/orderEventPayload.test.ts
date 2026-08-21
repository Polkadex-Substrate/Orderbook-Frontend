import { parseOrderEvent } from "./orderEventPayload";

/*
 * Jest globals, matching the rest of this package.
 *
 * The first fixture is the engine's CURRENT payload, field for field as
 * OrderEvent::from_order builds it (Orderbook-Backend appsync_client.rs). This
 * is the payload the old mapper read long names from, getting undefined for
 * every field that matters - which is why "order completed" notifications
 * never fired while everything else appeared to work.
 */

/** The abbreviated shape the engine sends today: a filled limit bid. */
const ABBREVIATED_FILL = {
  type: "Order",
  u: "esqTradeAddress",
  cid: "0xclientid",
  id: "0xorderid1234",
  t: "1755691200000",
  m: "PDEX-3496813586714279103",
  s: "Bid",
  ot: "LIMIT",
  st: "CLOSED",
  p: "2.0",
  q: "1.0",
  afp: "2.0",
  fq: "1.0",
  fee: "0.004",
  stid: "42",
  qoq: "0",
};

/** The long shape the engine used to send: same fill, old serialisation. */
const LONG_FILL = {
  type: "Order",
  stid: 42,
  client_order_id: "0xclientid",
  avg_filled_price: 2.0,
  fee: 0.004,
  filled_quantity: 1.0,
  status: "CLOSED",
  id: "0xorderid1234",
  user: "esqTradeAddress",
  pair: { base: { asset: "PDEX" }, quote: { asset: "3496813586714279103" } },
  side: "Bid",
  order_type: "LIMIT",
  qty: 1.0,
  price: 2.0,
  timestamp: 1755691200000,
};

describe("the reported failure: a fill in the engine's current shape", () => {
  it("parses the abbreviated payload the old mapper read as undefineds", () => {
    const parsed = parseOrderEvent(ABBREVIATED_FILL);
    expect(parsed).not.toBeNull();
    // The two fields the fill notice lives or dies on. Both were undefined
    // before, so orderUpdateNotice returned "none" for every real fill.
    expect(parsed?.status).toBe("CLOSED");
    expect(parsed?.filledQuantity).toBe("1.0");
  });

  it("carries everything else the provider and notifications use", () => {
    const parsed = parseOrderEvent(ABBREVIATED_FILL);
    expect(parsed).toMatchObject({
      user: "esqTradeAddress",
      marketId: "PDEX-3496813586714279103",
      orderId: "0xorderid1234",
      side: "Bid",
      type: "LIMIT",
      price: 2,
      quantity: "1.0",
      timestamp: 1755691200000,
    });
  });

  it("quantifies a filled market buy by its quote amount", () => {
    // Mirrors the query mapper: base qty was unknown when the order was
    // placed, so the quote amount is the honest figure.
    const parsed = parseOrderEvent({
      ...ABBREVIATED_FILL,
      ot: "MARKET",
      q: "0",
      qoq: "150.5",
    });
    expect(parsed?.quantity).toBe("150.5");
    expect(parsed?.type).toBe("MARKET");
  });

  it("keeps base quantity for an OPEN market buy", () => {
    const parsed = parseOrderEvent({
      ...ABBREVIATED_FILL,
      st: "OPEN",
      ot: "MARKET",
      qoq: "150.5",
    });
    expect(parsed?.quantity).toBe("1.0");
  });
});

describe("the legacy long shape still parses", () => {
  /*
   * The engine SWITCHED shapes once already; parsing only the new one does to
   * a rollback exactly what the old code did to the upgrade.
   */
  it("produces the same result as the abbreviated form of the same fill", () => {
    const fromLong = parseOrderEvent(LONG_FILL);
    const fromAbbrev = parseOrderEvent(ABBREVIATED_FILL);

    // The quantity fields stay strings end to end, and the two serialisations
    // spell the same number differently ("1.0" vs 1). Compare those as
    // numbers - that is how every consumer reads them - and the rest exactly.
    expect(Number(fromLong?.filledQuantity)).toBe(
      Number(fromAbbrev?.filledQuantity)
    );
    expect(Number(fromLong?.quantity)).toBe(Number(fromAbbrev?.quantity));

    const strip = (p: typeof fromLong) => {
      if (!p) return p;
      const { filledQuantity, quantity, ...rest } = p;
      return rest;
    };
    expect(strip(fromLong)).toEqual(strip(fromAbbrev));
  });
});

describe("payloads that must be dropped, not guessed at", () => {
  it("returns null rather than a soup of undefineds", () => {
    // Undefineds flowing through as an Order is the exact failure this module
    // replaces; null is the contract that prevents its return.
    for (const junk of [
      null,
      undefined,
      "string",
      42,
      {},
      { type: "Order" },
      { st: "NONSENSE", s: "Bid" },
      { st: "CLOSED", s: "Sideways" },
      { status: "CLOSED", side: "Neither" },
    ]) {
      expect(parseOrderEvent(junk)).toBeNull();
    }
  });

  it("rejects the statuses the frontend does not model", () => {
    // The GraphQL server enum also has PARTIAL. The frontend type does not.
    // If PARTIAL ever arrives on the wire this returns null - the payload is
    // dropped visibly at parse rather than half-processed downstream.
    expect(parseOrderEvent({ ...ABBREVIATED_FILL, st: "PARTIAL" })).toBeNull();
  });
});
