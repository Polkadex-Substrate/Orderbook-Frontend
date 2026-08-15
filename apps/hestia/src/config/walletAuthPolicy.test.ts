import {
  WALLET_AUTH,
  createsSecureIframe,
  type WalletAuthOptions,
} from "./walletAuthPolicy";

/*
 * Jest globals, matching the rest of this app.
 *
 * The thing worth guarding is not "email is false". It is that the combination
 * we pass produces NO auth connector under Reown's own condition, because that
 * connector is the hosted iframe that froze the tab. Half-disabling it - which is
 * the obvious mistake, since the library defaults both fields - would leave the
 * iframe in place and the freeze with it.
 */

describe("our config does not create the hosted auth iframe", () => {
  it("passes options that fail Reown's connector condition", () => {
    expect(createsSecureIframe(WALLET_AUTH)).toBe(false);
  });

  it("disables email AND socials, because either one alone is enough", () => {
    // Both halves stated explicitly: a future edit that restores one of them
    // should fail here rather than quietly reintroduce the frame.
    expect(WALLET_AUTH.email).toBe(false);
    expect(WALLET_AUTH.socials).toEqual([]);
  });
});

describe("createsSecureIframe - the library's rule, transcribed", () => {
  it("is true when email is on, whatever socials says", () => {
    const cases: WalletAuthOptions["socials"][] = [[], ["google"]];
    for (const socials of cases) {
      expect({
        socials,
        creates: createsSecureIframe({ email: true, socials }),
      }).toEqual({ socials, creates: true });
    }
  });

  it("is true when any social provider is listed, even with email off", () => {
    expect(createsSecureIframe({ email: false, socials: ["google"] })).toBe(
      true
    );
  });

  it("is true for the library's own defaults", () => {
    // Verbatim from defaultConfig.js. This is what we inherited by passing no
    // `auth` key at all, and it is why the iframe was on every page.
    const REOWN_DEFAULTS: WalletAuthOptions = {
      email: true,
      socials: [
        "google",
        "x",
        "discord",
        "farcaster",
        "github",
        "apple",
        "facebook",
      ],
    };
    expect(createsSecureIframe(REOWN_DEFAULTS)).toBe(true);
  });

  it("is false only when both are off", () => {
    expect(createsSecureIframe({ email: false, socials: [] })).toBe(false);
  });

  it("treats an omitted field as absent rather than as the library default", () => {
    // This function judges what we PASS. Merging with Reown's defaults happens
    // inside the library; conflating the two here would make the test agree with
    // itself instead of with the shipped behaviour.
    expect(createsSecureIframe({})).toBe(false);
  });
});
