import { EVM_WALLET_ROUTES, needsEvmWallet } from "./evmRoutes";

/*
 * Jest globals, matching the rest of this app.
 *
 * The two failure directions are not symmetric, so both are tested hard.
 *
 * Too NARROW: a route that needs wagmi does not get the provider, `useAccount`
 * throws, and the bridge is broken outright. Loud, immediate, obvious.
 *
 * Too WIDE: a route that does not need it mounts WalletConnect, the verify
 * iframe and the MetaMask handshake anyway. Silent - the page still works, it
 * is just carrying the startup cost this change exists to remove, and nobody
 * would notice for months.
 */

describe("needsEvmWallet - routes that must have the provider", () => {
  it("covers both wagmi routes exactly", () => {
    expect(needsEvmWallet("/bridge")).toBe(true);
    expect(needsEvmWallet("/faucet")).toBe(true);
  });

  it("covers their children, including query-bearing bridge links", () => {
    // The balances page links to /bridge?from=...&to=...&asset=..., and
    // usePathname strips the query - but a nested route is plausible and must
    // not silently lose the provider.
    for (const path of ["/bridge/confirm", "/faucet/history"]) {
      expect({ path, needs: needsEvmWallet(path) }).toEqual({
        path,
        needs: true,
      });
    }
  });

  it("keeps the list and the predicate in agreement", () => {
    // Adding a route to the constant without the predicate honouring it would
    // be a silent breakage of the new route.
    for (const route of EVM_WALLET_ROUTES) {
      expect({ route, needs: needsEvmWallet(route) }).toEqual({
        route,
        needs: true,
      });
    }
  });
});

describe("needsEvmWallet - routes that must NOT pay for it", () => {
  it("excludes the trading page, which is where the freeze is", () => {
    expect(needsEvmWallet("/trading/PDEX-USDT")).toBe(false);
    expect(needsEvmWallet("/trading")).toBe(false);
  });

  it("excludes every other route in the app", () => {
    const others = [
      "/",
      "/balances",
      "/history",
      "/rewards",
      "/rewards/info",
      "/transfer/PDEX",
      "/legal/terms",
      "/welcome",
      "/faq",
      "/cexOnRamp",
    ];
    for (const path of others) {
      expect({ path, needs: needsEvmWallet(path) }).toEqual({
        path,
        needs: false,
      });
    }
  });

  it("does not match a route that merely starts with the same letters", () => {
    // Prefix matching anchored at a segment boundary. "/bridgehead" is not a
    // child of "/bridge", and a naive startsWith would say it was.
    for (const path of ["/bridgehead", "/faucets", "/bridge-old"]) {
      expect({ path, needs: needsEvmWallet(path) }).toEqual({
        path,
        needs: false,
      });
    }
  });

  it("returns false rather than throwing when there is no pathname", () => {
    // usePathname can be null during the first render in some Next versions.
    // Throwing here would take down every page in the app.
    for (const path of [null, undefined, ""]) {
      expect(() => needsEvmWallet(path)).not.toThrow();
      expect(needsEvmWallet(path)).toBe(false);
    }
  });
});
