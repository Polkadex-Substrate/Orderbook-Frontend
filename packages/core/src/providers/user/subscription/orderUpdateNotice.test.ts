import { orderUpdateNotice } from "./orderUpdateNotice";

/*
 * Ground truth: "There's no visual feedback when an order gets fulfilled
 * instantly when placed. This leaves the user confused on what happened to
 * their order."
 *
 * The fill notice was gated on `findOrder` - the order already being in Open
 * Orders. An instantly-filled order never gets there, so the single CLOSED
 * update found nothing, said nothing, and the order was absent from Open Orders
 * too. Every signal on screen said it had vanished.
 */

const order = (over: Record<string, unknown> = {}) => ({
  orderId: "o-1",
  status: "CLOSED",
  filledQuantity: "1",
  quantity: "1",
  ...over,
});

describe("orderUpdateNotice - the instant fill", () => {
  it("THE bug: announces a fill with NO previous open order", () => {
    // The reported case. Previously: silence.
    expect(orderUpdateNotice(order(), undefined).kind).toBe("filled");
    expect(orderUpdateNotice(order(), null).kind).toBe("filled");
  });

  it("still announces a fill for an order that had been resting", () => {
    const previous = order({ status: "OPEN", filledQuantity: "0" });
    expect(orderUpdateNotice(order(), previous).kind).toBe("filled");
  });

  it("announces a partial fill on entry, with no previous row", () => {
    // A marketable limit order that fills part way and rests. The old
    // comparison needed `findOrder.filledQuantity` and could not run.
    const partial = order({
      status: "OPEN",
      filledQuantity: "0.4",
      quantity: "1",
    });
    expect(orderUpdateNotice(partial, undefined).kind).toBe("partial");
  });
});

describe("orderUpdateNotice - not crying wolf", () => {
  it("says nothing for a resting order that has filled nothing", () => {
    const resting = order({ status: "OPEN", filledQuantity: "0" });
    expect(orderUpdateNotice(resting, undefined).kind).toBe("none");
  });

  it("announces a partial fill only when the filled amount INCREASED", () => {
    const before = order({ status: "OPEN", filledQuantity: "0.4" });
    const same = order({ status: "OPEN", filledQuantity: "0.4" });
    const more = order({ status: "OPEN", filledQuantity: "0.7" });

    expect(orderUpdateNotice(same, before).kind).toBe("none");
    expect(orderUpdateNotice(more, before).kind).toBe("partial");
  });

  it("does not call a zero-fill close a fill", () => {
    // CLOSED having filled nothing is an expiry or a rejection. "Filled" here
    // would be worse than silence.
    const closedEmpty = order({ status: "CLOSED", filledQuantity: "0" });
    const n = orderUpdateNotice(closedEmpty, undefined);
    expect(n.kind).toBe("none");
    if (n.kind !== "none") throw new Error("unreachable");
    expect(n.reason).toContain("without filling");
  });

  it("passes cancellations through unchanged", () => {
    expect(
      orderUpdateNotice(order({ status: "CANCELLED", filledQuantity: "0" }))
        .kind
    ).toBe("cancelled");
    // A cancel after a partial fill is still a cancel, not a fill.
    expect(
      orderUpdateNotice(order({ status: "CANCELLED", filledQuantity: "0.5" }))
        .kind
    ).toBe("cancelled");
  });
});

describe("orderUpdateNotice - junk in, silence out", () => {
  it("never throws and never invents a notice", () => {
    for (const bad of [
      null,
      undefined,
      {},
      { status: "WAT", filledQuantity: "1" },
      { status: "CLOSED", filledQuantity: "not-a-number" },
      { status: "CLOSED", filledQuantity: Number.NaN },
      { status: "OPEN", filledQuantity: -5 },
    ]) {
      expect(() => orderUpdateNotice(bad as never)).not.toThrow();
      expect(orderUpdateNotice(bad as never).kind).toBe("none");
    }
  });

  it("accepts numeric as well as string quantities", () => {
    // The wire sends strings; some paths have already coerced.
    expect(orderUpdateNotice(order({ filledQuantity: 1 })).kind).toBe("filled");
    expect(
      orderUpdateNotice(
        order({ status: "OPEN", filledQuantity: 0.7 }),
        order({ status: "OPEN", filledQuantity: 0.4 })
      ).kind
    ).toBe("partial");
  });

  it("treats a missing previous filledQuantity as zero, not as unknown", () => {
    // A previous row that predates the field must not suppress a real fill.
    const before = { orderId: "o-1", status: "OPEN" };
    const now = order({ status: "OPEN", filledQuantity: "0.2" });
    expect(orderUpdateNotice(now, before).kind).toBe("partial");
  });
});
