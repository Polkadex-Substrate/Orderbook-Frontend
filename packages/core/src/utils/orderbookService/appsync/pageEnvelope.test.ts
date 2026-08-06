import { readGqlPage, describeGqlErrors } from "./pageEnvelope";

/*
 * These cases are the difference between "you have no open orders" and "we could
 * not read your open orders". Getting it wrong does not crash anything - it makes
 * the UI confidently state something false about the user's money, which is how
 * a placed order looked lost.
 */

const KEY = "listOpenOrdersByTradeAccount";

describe("readGqlPage", () => {
  it("returns items and nextToken on a normal page", () => {
    const res = {
      data: { [KEY]: { items: [{ id: "1" }, { id: "2" }], nextToken: "abc" } },
    };
    expect(readGqlPage(res, KEY)).toEqual({
      items: [{ id: "1" }, { id: "2" }],
      nextToken: "abc",
    });
  });

  it("treats a resolved-but-empty page as EMPTY, not an error", () => {
    // The genuine "no open orders" case. If this ever throws, every new user
    // sees an error instead of an empty state.
    expect(readGqlPage({ data: { [KEY]: { items: [] } } }, KEY)).toEqual({
      items: [],
      nextToken: null,
    });
  });

  it("normalises a missing items array to []", () => {
    expect(readGqlPage({ data: { [KEY]: {} } }, KEY)).toEqual({
      items: [],
      nextToken: null,
    });
  });

  it("normalises null items and null nextToken", () => {
    const res = { data: { [KEY]: { items: null, nextToken: null } } };
    expect(readGqlPage(res, KEY)).toEqual({ items: [], nextToken: null });
  });

  it("THROWS when the field is null, carrying the server's error message", () => {
    // The actual failure shape: data present, field null, reason in errors.
    // Previously this threw "Cannot read properties of null (reading
    // 'nextToken')" and the real message never reached anyone.
    const res = {
      data: { [KEY]: null },
      errors: [{ message: "Unknown field argument trade_account" }],
    };
    expect(() => readGqlPage(res, KEY)).toThrow(
      /Unknown field argument trade_account/
    );
    expect(() => readGqlPage(res, KEY)).toThrow(new RegExp(KEY));
  });

  it("throws when the field is simply absent from data", () => {
    expect(() => readGqlPage({ data: {} }, KEY)).toThrow(
      /returned no "listOpenOrdersByTradeAccount" field/
    );
  });

  it("throws on a null or missing data envelope", () => {
    expect(() => readGqlPage({ data: null }, KEY)).toThrow(/no data/);
    expect(() => readGqlPage({}, KEY)).toThrow(/no data/);
    expect(() => readGqlPage(null, KEY)).toThrow(/no data/);
    expect(() => readGqlPage(undefined, KEY)).toThrow(/no data/);
  });

  it("joins multiple server errors instead of dropping all but one", () => {
    const res = {
      data: { [KEY]: null },
      errors: [{ message: "first thing" }, { message: "second thing" }],
    };
    expect(() => readGqlPage(res, KEY)).toThrow(/first thing; second thing/);
  });

  it("never throws an error whose message ends at the colon", () => {
    // Guards the fallback: an empty errors array must still explain itself.
    for (const errors of [[], [{}], [{ message: "" }], [{ message: "   " }]]) {
      let message = "";
      try {
        readGqlPage({ data: { [KEY]: null }, errors }, KEY);
      } catch (e) {
        message = (e as Error).message;
      }
      expect(message).toMatch(/returned no data: \S/);
    }
  });
});

describe("describeGqlErrors", () => {
  it("falls back to naming the key when there is nothing usable", () => {
    expect(describeGqlErrors(undefined, KEY)).toBe(
      `the server returned no "${KEY}" field`
    );
    expect(describeGqlErrors(null, KEY)).toContain(KEY);
    expect(describeGqlErrors([], KEY)).toContain(KEY);
  });

  it("drops blank messages but keeps real ones alongside them", () => {
    expect(
      describeGqlErrors([{ message: "" }, { message: "real problem" }], KEY)
    ).toBe("real problem");
  });
});
