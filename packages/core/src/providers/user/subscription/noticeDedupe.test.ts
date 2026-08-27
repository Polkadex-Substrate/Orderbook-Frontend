import {
  NOTICE_DEDUPE_LIMIT,
  createNoticeDedupeStore,
  shouldAnnounceOrderState,
} from "./noticeDedupe";

/*
 * Jest globals, matching the rest of this package.
 *
 * Bug 9: one fill, two identical toasts. The engine publishes each order event
 * to the user channel AND the main channel, and the frontend subscribes to
 * both, so every event arrives twice. These tests are written around the two
 * failure directions: announcing twice (the reported bug) and announcing never
 * (the bug this system had just before, which is worse).
 */

const FILL = { orderId: "0xabc", status: "CLOSED", filledQuantity: "2" };

describe("the reported bug: one fill, two copies, one toast", () => {
  it("announces the first copy and swallows the second", () => {
    const store = createNoticeDedupeStore();
    expect(shouldAnnounceOrderState(store, FILL)).toBe(true);
    expect(shouldAnnounceOrderState(store, { ...FILL })).toBe(false);
  });

  it("swallows the duplicate regardless of which channel delivered first", () => {
    // The two subscriptions race; nothing about the event says which copy this
    // is. Identity alone must decide.
    const store = createNoticeDedupeStore();
    shouldAnnounceOrderState(store, FILL);
    for (let i = 0; i < 5; i++) {
      expect(shouldAnnounceOrderState(store, FILL)).toBe(false);
    }
  });
});

describe("genuinely new states are still announced", () => {
  it("announces each stage of an order's life once", () => {
    const store = createNoticeDedupeStore();
    const open = { orderId: "0xabc", status: "OPEN", filledQuantity: "0" };
    const partial = { orderId: "0xabc", status: "OPEN", filledQuantity: "1" };
    const closed = { orderId: "0xabc", status: "CLOSED", filledQuantity: "2" };

    for (const event of [open, partial, closed]) {
      expect(shouldAnnounceOrderState(store, event)).toBe(true);
      expect(shouldAnnounceOrderState(store, event)).toBe(false);
    }
  });

  it("keeps different orders independent", () => {
    const store = createNoticeDedupeStore();
    expect(shouldAnnounceOrderState(store, FILL)).toBe(true);
    expect(shouldAnnounceOrderState(store, { ...FILL, orderId: "0xdef" })).toBe(
      true
    );
  });
});

describe("failure directions", () => {
  it("announces an event with no order id rather than guessing", () => {
    // Cannot deduplicate what cannot be identified. A duplicate toast is
    // annoying; a silently missing fill notice is the bug this replaces.
    const store = createNoticeDedupeStore();
    const anonymous = { status: "CLOSED", filledQuantity: "1" };
    expect(shouldAnnounceOrderState(store, anonymous)).toBe(true);
    expect(shouldAnnounceOrderState(store, anonymous)).toBe(true);
  });

  it("is bounded: old entries are evicted, memory does not grow forever", () => {
    const store = createNoticeDedupeStore();
    for (let i = 0; i <= NOTICE_DEDUPE_LIMIT; i++) {
      shouldAnnounceOrderState(store, { ...FILL, orderId: `0x${i}` });
    }
    expect(store.seen.size).toBeLessThanOrEqual(NOTICE_DEDUPE_LIMIT);
    // The oldest entry fell out: seeing it again announces again. Acceptable -
    // it was announced hundreds of order-states ago; the duplicates this
    // catches arrive within milliseconds.
    expect(shouldAnnounceOrderState(store, { ...FILL, orderId: "0x0" })).toBe(
      true
    );
  });
});
