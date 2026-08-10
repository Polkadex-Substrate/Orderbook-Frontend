import { FALLBACK_TITLE, isUnusableTitle, toastTitle } from "./toastTitle";

/*
 * Ground truth: ORDERBOOK-TESTNET-4, 2026-08-10. An order submission failed
 * with a titleless error, and the ERROR HANDLER crashed on it:
 *
 *   TypeError: Cannot read properties of undefined (reading 'toString')
 *   ./src/components/ui/DynamicProviders/index.tsx:139:35
 *
 * 31 events from one user in eight minutes. The user saw no toast, the real
 * failure was discarded, and Sentry reported the notification layer instead of
 * the order.
 */

describe("toastTitle - THE bug", () => {
  it("does not throw on undefined or null", () => {
    // This is the crash, verbatim: title.toString() where title is undefined.
    expect(() => toastTitle(undefined)).not.toThrow();
    expect(() => toastTitle(null)).not.toThrow();
    expect(toastTitle(undefined)).toBe(FALLBACK_TITLE);
    expect(toastTitle(null)).toBe(FALLBACK_TITLE);
  });

  it("never returns an empty string, whatever it is given", () => {
    // An empty title renders a toast with no text - visually a bug, and it
    // would have hidden this same failure in a quieter way.
    for (const input of [
      undefined,
      null,
      "",
      "   ",
      {},
      [],
      Number.NaN,
      Symbol("x"),
      () => undefined,
      new Error(""),
    ]) {
      expect(toastTitle(input as unknown).length).toBeGreaterThan(0);
    }
  });
});

describe("toastTitle - keeping the information that exists", () => {
  it("uses a plain string", () => {
    expect(toastTitle("Order rejected")).toBe("Order rejected");
  });

  it("trims, and treats blank as absent", () => {
    expect(toastTitle("  Order rejected  ")).toBe("Order rejected");
    expect(toastTitle("   ")).toBe(FALLBACK_TITLE);
  });

  it("prefers an Error's message over its wrapper", () => {
    // String(new Error("x")) is "Error: x". The prefix is noise to a user.
    expect(toastTitle(new Error("Insufficient balance"))).toBe(
      "Insufficient balance"
    );
  });

  it("keeps 0 and false, which a truthiness check would have dropped", () => {
    expect(toastTitle(0)).toBe("0");
    expect(toastTitle(false)).toBe("false");
  });

  it("rejects NaN, because 'NaN' on screen is never intended", () => {
    expect(toastTitle(Number.NaN)).toBe(FALLBACK_TITLE);
  });

  it("digs a message out of the shapes wallets and RPCs actually send", () => {
    expect(toastTitle({ message: "1010: Invalid Transaction" })).toBe(
      "1010: Invalid Transaction"
    );
    expect(toastTitle({ reason: "execution reverted" })).toBe(
      "execution reverted"
    );
    expect(toastTitle({ error: "nonce too low" })).toBe("nonce too low");
  });

  it("never renders [object Object]", () => {
    // The classic. It looks like information and is not.
    for (const input of [{}, { code: 4001 }, { a: { b: 1 } }]) {
      expect(toastTitle(input)).not.toContain("[object");
    }
  });

  it("falls back rather than throwing on a circular object", () => {
    const circular: Record<string, unknown> = { a: 1 };
    circular.self = circular;
    expect(() => toastTitle(circular)).not.toThrow();
    expect(toastTitle(circular)).toBe(FALLBACK_TITLE);
  });

  it("serialises an object that carries no message but does have fields", () => {
    // Better a JSON blob than a generic apology: it gives the user something
    // to paste into a bug report.
    expect(toastTitle({ code: 4001 })).toBe('{"code":4001}');
  });
});

describe("isUnusableTitle - so a missing title stays reportable", () => {
  it("flags the cases that fell back", () => {
    expect(isUnusableTitle(undefined)).toBe(true);
    expect(isUnusableTitle(null)).toBe(true);
    expect(isUnusableTitle("")).toBe(true);
    expect(isUnusableTitle({})).toBe(true);
  });

  it("does not flag a real title", () => {
    expect(isUnusableTitle("Order rejected")).toBe(false);
    expect(isUnusableTitle(new Error("boom"))).toBe(false);
    expect(isUnusableTitle(0)).toBe(false);
  });

  it("does not flag a caller who genuinely passed the fallback text", () => {
    // Otherwise fixing the crash would start reporting a phantom bug every
    // time someone legitimately used that wording.
    expect(isUnusableTitle(FALLBACK_TITLE)).toBe(false);
  });
});
