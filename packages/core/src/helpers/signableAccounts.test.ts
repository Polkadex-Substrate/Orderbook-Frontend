import {
  splitSignableAccounts,
  unavailableProxies,
  unavailableReason,
} from "./signableAccounts";

/*
 * Ground truth: selecting a trading account this browser has no key for failed
 * only at submit, with polkadot's raw "Unable to retrieve keypair". A trading
 * account is a chain-side proxy AND a local keypair; the app listed the first
 * and assumed the second.
 */

const HELD = "esqHELD00000000000000000000000000000000000000000";
const MISSING = "esqMISSING000000000000000000000000000000000000000";

/** Mirrors polkadot: THROWS on a missing pair rather than returning undefined. */
const keyring = (held: string[]) => ({
  getPair: (address: string) => {
    if (!held.includes(address))
      throw new Error(`Unable to retrieve keypair '${address}'`);
    return { address, isLocked: false };
  },
});

describe("splitSignableAccounts", () => {
  it("keeps what the browser holds and records what it does not", () => {
    const r = splitSignableAccounts([HELD, MISSING], keyring([HELD]));
    expect(r.signable).toHaveLength(1);
    expect(r.signable[0]).toMatchObject({ address: HELD });
    expect(r.unavailable).toEqual([MISSING]);
  });

  it("THE bug: one missing address no longer takes the whole list down", () => {
    // `localAddresses.map((a) => wallet.getPair(a))` threw on the first miss,
    // so the memo produced nothing instead of a shorter list.
    expect(() =>
      splitSignableAccounts([MISSING, HELD, MISSING], keyring([HELD]))
    ).not.toThrow();
    const r = splitSignableAccounts([MISSING, HELD, MISSING], keyring([HELD]));
    expect(r.signable).toHaveLength(1);
    expect(r.unavailable).toHaveLength(2);
  });

  it("treats a wallet that is not ready as 'nothing signable yet'", () => {
    // Not as 'these accounts do not exist' - they are simply unusable for now.
    const r = splitSignableAccounts([HELD, MISSING], null);
    expect(r.signable).toEqual([]);
    expect(r.unavailable).toEqual([HELD, MISSING]);
  });

  it("survives empty and nullish inputs", () => {
    for (const input of [[], null, undefined]) {
      const r = splitSignableAccounts(input, keyring([HELD]));
      expect(r.signable).toEqual([]);
      expect(r.unavailable).toEqual([]);
    }
  });

  it("skips empty strings rather than counting them as unavailable accounts", () => {
    const r = splitSignableAccounts(["", HELD], keyring([HELD]));
    expect(r.signable).toHaveLength(1);
    expect(r.unavailable).toEqual([]);
  });

  it("handles a keyring that returns undefined instead of throwing", () => {
    const r = splitSignableAccounts([MISSING], { getPair: () => undefined });
    expect(r.signable).toEqual([]);
    expect(r.unavailable).toEqual([MISSING]);
  });
});

describe("unavailableProxies", () => {
  it("names the on-chain proxies with no local key", () => {
    expect(unavailableProxies([HELD, MISSING], [HELD])).toEqual([MISSING]);
  });

  it("is empty when the browser holds every proxy", () => {
    expect(unavailableProxies([HELD], [HELD])).toEqual([]);
  });

  it("does not invent entries from nullish input", () => {
    expect(unavailableProxies(null, [HELD])).toEqual([]);
    expect(unavailableProxies([HELD], null)).toEqual([HELD]);
  });

  it("says why, in words a user can act on", () => {
    const reason = unavailableReason();
    expect(reason).toContain("not in this browser");
    expect(reason).toContain("Import");
    // Never leak the keyring's own phrasing.
    expect(reason).not.toContain("keypair");
  });
});
