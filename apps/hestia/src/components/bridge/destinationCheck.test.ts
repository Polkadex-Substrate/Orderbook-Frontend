import { checkDestination, describeDestination } from "./destinationCheck";

/*
 * Ground truth: the tester was signed in as "test account" and the Confirm
 * Transaction dialog showed the destination as "Substrate Account 1". Both
 * accounts live in the same extension. The transfer succeeded - into the other
 * account - and the app, which only ever displays the signed-in account, showed
 * nothing for fifteen hours.
 */

/** Stand-in for decodeAddress + u8aToHex: strip the prefix marker. */
const toPublicKey = (address: string): string | null => {
  const match = /^[0-9]+:(.+)$/.exec(address);
  return match ? match[1] : null;
};

const SAME_KEY_PREFIX_88 = "88:0xdeadbeef";
const SAME_KEY_PREFIX_42 = "42:0xdeadbeef";
const OTHER_KEY = "88:0xfeedface";

describe("checkDestination - the transfer that went to the other account", () => {
  it("flags the reported case: signed in as one account, sending to another", () => {
    const check = checkDestination({
      destinationAddress: OTHER_KEY,
      destinationName: "Substrate Account 1",
      signedInAddress: SAME_KEY_PREFIX_88,
      signedInName: "test account",
      toPublicKey,
    });
    expect(check.status).toBe("mismatch");
    if (check.status !== "mismatch") throw new Error("unreachable");
    expect(check.destinationName).toBe("Substrate Account 1");
    expect(check.signedInName).toBe("test account");
  });

  it("does NOT flag the same key under a different SS58 prefix", () => {
    // The single most important case. Polkadex prints 88, extensions often hand
    // back 42 or 0, so a string comparison would warn on every transfer ever
    // made - and a warning that always fires is a warning nobody reads.
    expect(
      checkDestination({
        destinationAddress: SAME_KEY_PREFIX_42,
        destinationName: "test account",
        signedInAddress: SAME_KEY_PREFIX_88,
        signedInName: "test account",
        toPublicKey,
      }).status
    ).toBe("match");
  });

  it("stays silent when either side is missing", () => {
    for (const [dest, signed] of [
      [null, SAME_KEY_PREFIX_88],
      [SAME_KEY_PREFIX_88, null],
      ["", ""],
      [undefined, undefined],
    ] as const) {
      expect(
        checkDestination({
          destinationAddress: dest,
          signedInAddress: signed,
          toPublicKey,
        }).status
      ).toBe("unknown");
    }
  });

  it("treats an undecodable address as unknown, never as a mismatch", () => {
    // A warning raised because we could not READ an address looks exactly like
    // a warning that the funds are going elsewhere. Unknown means unknown.
    expect(
      checkDestination({
        destinationAddress: "not-an-address",
        signedInAddress: SAME_KEY_PREFIX_88,
        toPublicKey,
      }).status
    ).toBe("unknown");
  });

  it("survives a decoder that throws, which decodeAddress does", () => {
    const throwing = () => {
      throw new Error("Invalid decoded address checksum");
    };
    expect(() =>
      checkDestination({
        destinationAddress: "garbage",
        signedInAddress: SAME_KEY_PREFIX_88,
        toPublicKey: throwing,
      })
    ).not.toThrow();
    expect(
      checkDestination({
        destinationAddress: "garbage",
        signedInAddress: SAME_KEY_PREFIX_88,
        toPublicKey: throwing,
      }).status
    ).toBe("unknown");
  });

  it("ignores case, since hex encoders disagree about it", () => {
    expect(
      checkDestination({
        destinationAddress: "88:0xDEADBEEF",
        signedInAddress: "42:0xdeadbeef",
        toPublicKey,
      }).status
    ).toBe("match");
  });

  it("still warns when the accounts have no names", () => {
    const check = checkDestination({
      destinationAddress: OTHER_KEY,
      destinationName: "   ",
      signedInAddress: SAME_KEY_PREFIX_88,
      signedInName: null,
      toPublicKey,
    });
    expect(check.status).toBe("mismatch");
    if (check.status !== "mismatch") throw new Error("unreachable");
    expect(check.destinationName).toBe("another account");
  });
});

describe("describeDestination - what the user reads before signing", () => {
  it("names both accounts and says where the funds will be", () => {
    const text =
      describeDestination(
        checkDestination({
          destinationAddress: OTHER_KEY,
          destinationName: "Substrate Account 1",
          signedInAddress: SAME_KEY_PREFIX_88,
          signedInName: "test account",
          toPublicKey,
        })
      ) ?? "";
    expect(text).toContain("Substrate Account 1");
    expect(text).toContain("test account");
    // The tester's real question was "did I lose it". Answer it here, before
    // they sign, rather than fifteen hours later.
    expect(text).toMatch(/will arrive/i);
  });

  it("says nothing when there is nothing to say", () => {
    expect(describeDestination({ status: "match" })).toBeNull();
    expect(describeDestination({ status: "unknown" })).toBeNull();
  });
});
