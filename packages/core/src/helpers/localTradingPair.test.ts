import { localTradingPair } from "./localTradingPair";

/*
 * Ground truth: selling USDC raised
 *   Unable to retrieve keypair 'esq2MfBtGU9n1bq1tPCeRCZ5ZoKDEV82HPDTmxpAkBajqx7fP'
 * straight from @polkadot/keyring, because keyring.getPair THROWS when the pair
 * is absent - so `if (!keyringPair) throw new Error("Invalid trading account")`
 * in four hooks was unreachable dead code.
 */

const ADDR = "esq2MfBtGU9n1bq1tPCeRCZ5ZoKDEV82HPDTmxpAkBajqx7fP";

const throwingWallet = {
  getPair: (address: string) => {
    throw new Error(`Unable to retrieve keypair '${address}'`);
  },
};
const okWallet = { getPair: () => ({ isLocked: false }) };
const lockedWallet = { getPair: () => ({ isLocked: true }) };

describe("localTradingPair", () => {
  it("returns the pair when the keyring has it", () => {
    const r = localTradingPair(okWallet, ADDR);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("unreachable");
    expect(r.pair).toEqual({ isLocked: false });
  });

  it("THE bug: a THROWING getPair becomes an actionable message", () => {
    // Previously this escaped to a toast verbatim.
    const r = localTradingPair(throwingWallet, ADDR);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.reason).toBe("missing");
    expect(r.message).not.toContain("Unable to retrieve keypair");
    expect(r.message).toContain("not available in this browser");
    // Says what to do, not just what failed.
    expect(r.message).toMatch(/Import the account again|pick a different/);
  });

  it("truncates the address instead of printing 48 base58 characters", () => {
    const r = localTradingPair(throwingWallet, ADDR);
    if (r.ok) throw new Error("unreachable");
    expect(r.message).toContain("esq2Mf...jqx7fP");
    expect(r.message).not.toContain(ADDR);
  });

  it("reports LOCKED separately - the remedy is a password, not a re-import", () => {
    const r = localTradingPair(lockedWallet, ADDR);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.reason).toBe("locked");
    expect(r.message).toContain("unlock");
  });

  it("handles a getPair that returns undefined rather than throwing", () => {
    // Not polkadot's behaviour today, but the signature permits it and a future
    // version might. Both paths must land in the same place.
    const r = localTradingPair({ getPair: () => undefined as never }, ADDR);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.reason).toBe("missing");
  });

  it("says something useful when there is no wallet or no selection", () => {
    const noWallet = localTradingPair(null, ADDR);
    expect(noWallet.ok).toBe(false);
    if (noWallet.ok) throw new Error("unreachable");
    expect(noWallet.message).toContain("not ready");

    const noAddress = localTradingPair(okWallet, "");
    expect(noAddress.ok).toBe(false);
    if (noAddress.ok) throw new Error("unreachable");
    expect(noAddress.message).toContain("No trading account");
  });

  it("never lets a keyring error reach the caller", () => {
    // The property that matters: whatever getPair does, this does not throw.
    const hostile = {
      getPair: () => {
        throw new Error("something else entirely");
      },
    };
    expect(() => localTradingPair(hostile, ADDR)).not.toThrow();
    expect(localTradingPair(hostile, ADDR).ok).toBe(false);
  });
});
