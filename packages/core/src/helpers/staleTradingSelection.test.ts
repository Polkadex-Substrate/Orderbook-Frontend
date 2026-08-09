import {
  isStaleTradingSelection,
  staleSelectionMessage,
} from "./staleTradingSelection";

/*
 * Ground truth: the picker now offers only signable accounts, but the SELECTION
 * is persisted and survives the key going away. The stored address still
 * reaches useCreateOrder, so the keyring error appears at submit for an account
 * the UI never offered.
 *
 * The hazard in fixing it is timing: the keyring loads asynchronously, so an
 * over-eager clear would deselect everyone's trading account on every page
 * load. Every uncertain case must leave the selection alone.
 */

const HELD = "esqHELD";
const GONE = "esqGONE";
const EXT = "5ExtensionAccount";

const base = { signableAddresses: [HELD], ready: true };

describe("isStaleTradingSelection - the case it exists for", () => {
  it("drops a remembered account whose key is not here", () => {
    expect(isStaleTradingSelection({ ...base, selected: GONE })).toBe(true);
  });

  it("keeps a remembered account whose key IS here", () => {
    expect(isStaleTradingSelection({ ...base, selected: HELD })).toBe(false);
  });

  it("drops it even when the keyring is genuinely empty, once ready", () => {
    expect(
      isStaleTradingSelection({
        selected: GONE,
        signableAddresses: [],
        ready: true,
      })
    ).toBe(true);
  });
});

describe("isStaleTradingSelection - refusing to log anyone out", () => {
  it("NEVER decides before the keyring is ready", () => {
    // The dangerous case. An empty list during load means "not yet", not
    // "gone", and clearing here would deselect every user on every page load.
    expect(
      isStaleTradingSelection({
        selected: GONE,
        signableAddresses: [],
        ready: false,
      })
    ).toBe(false);
    expect(
      isStaleTradingSelection({
        selected: HELD,
        signableAddresses: [],
        ready: false,
      })
    ).toBe(false);
  });

  it("treats an unknown list as unknown, not as empty", () => {
    for (const addresses of [null, undefined]) {
      expect(
        isStaleTradingSelection({
          ...base,
          selected: GONE,
          signableAddresses: addresses,
        })
      ).toBe(false);
    }
  });

  it("leaves the extension account alone - it signs without a local key", () => {
    expect(
      isStaleTradingSelection({
        ...base,
        selected: EXT,
        extensionAddress: EXT,
        signableAddresses: [],
      })
    ).toBe(false);
  });

  it("does nothing when nothing is selected", () => {
    for (const selected of ["", null, undefined]) {
      expect(isStaleTradingSelection({ ...base, selected })).toBe(false);
    }
  });

  it("is false in every combination that is not a definite miss", () => {
    // Property: a true result requires ready AND a real array AND a selection
    // that is neither the extension nor held.
    const cases = [
      { selected: GONE, signableAddresses: [HELD], ready: false },
      { selected: GONE, signableAddresses: null, ready: true },
      { selected: HELD, signableAddresses: [HELD], ready: true },
      { selected: "", signableAddresses: [], ready: true },
      {
        selected: EXT,
        extensionAddress: EXT,
        signableAddresses: [],
        ready: true,
      },
    ];
    for (const c of cases) expect(isStaleTradingSelection(c)).toBe(false);
  });
});

describe("staleSelectionMessage", () => {
  it("explains what happened and what to do, without keyring jargon", () => {
    const m = staleSelectionMessage();
    expect(m).toContain("not in this browser");
    expect(m).toMatch(/Select or import/);
    expect(m).not.toContain("keypair");
  });
});
