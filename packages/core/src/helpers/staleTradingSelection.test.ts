import {
  isStaleTradingSelection,
  staleSelectionMessage,
  staleSelectionReport,
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

describe("staleSelectionReport - for the open 'keeps asking' bug", () => {
  /*
   * A user is being asked to connect a trading account repeatedly in one
   * session, and reconnecting the wallet fixes it. A genuinely absent key does
   * not come back when you reconnect a wallet, so that is a spurious drop -
   * most likely an empty signable list arriving while `ready` is already true.
   *
   * One render cannot tell that from a real absence. The report captures what
   * distinguishes them over time.
   */

  it("flags the suspicious case: ready, but nothing signable at all", () => {
    const report = staleSelectionReport({
      selected: GONE,
      signableAddresses: [],
      ready: true,
    });
    expect(report.emptySignableList).toBe(true);
    expect(report.signableCount).toBe(0);
    expect(report.ready).toBe(true);
  });

  it("does not flag a genuine stale selection alongside other accounts", () => {
    // The legitimate case this feature was built for: the key is gone, but the
    // browser holds others. Not a timing artefact.
    const report = staleSelectionReport({ ...base, selected: GONE });
    expect(report.emptySignableList).toBe(false);
    expect(report.signableCount).toBe(1);
  });

  it("distinguishes an unknown list from an empty one", () => {
    const report = staleSelectionReport({
      selected: GONE,
      signableAddresses: undefined,
      ready: true,
    });
    expect(report.signableCount).toBeNull();
    expect(report.emptySignableList).toBe(false);
  });

  it("carries no addresses", () => {
    // Counts answer the question; which accounts a person holds does not, so it
    // is not collected.
    const report = staleSelectionReport({
      selected: GONE,
      extensionAddress: EXT,
      signableAddresses: [HELD],
      ready: true,
    });
    const serialised = JSON.stringify(report);
    for (const address of [GONE, HELD, EXT]) {
      expect(serialised).not.toContain(address);
    }
    // But it does say whether an extension was connected, which matters:
    // reconnecting a wallet is what the user found made it work.
    expect(report.hasExtensionAddress).toBe(true);
  });
});
