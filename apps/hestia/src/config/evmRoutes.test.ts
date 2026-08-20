import { readFileSync, existsSync } from "fs";
import { join } from "path";

import { EVM_WALLET_ROUTES, needsEvmWallet } from "./evmRoutes";

/*
 * Jest globals, matching the rest of this app.
 *
 * Two kinds of test here. The first block is ordinary unit testing of the route
 * predicate. The second is source-level, and it exists because the interesting
 * failure is not in any function - it is in WHERE a component is mounted.
 *
 * THE HISTORY, BECAUSE IT IS THE REASON FOR THE SECOND BLOCK.
 *
 * The EVM wallet stack was mounted for the entire app from the root layout, so
 * the trading page booted WalletConnect, the verify iframe, the MetaMask
 * handshake, EIP-6963 discovery and the Coinbase SDK without using any of them.
 *
 * The first fix moved the decision into a component in the ROOT LAYOUT that
 * chose per route:
 *
 *     if (!needsEvmWallet(pathname)) return <>{children}</>;
 *     return <Web3ModalProvider>{children}</Web3ModalProvider>;
 *
 * That removed the stack from other pages and introduced a worse bug. The
 * children sat at a different position in the element tree depending on the
 * route, so navigating from /trading to /bridge made React unmount and remount
 * every provider below - the keyring included. It reloaded, reported `isReady`
 * before its addresses arrived, and the stale-selection guard deselected the
 * user's trading account. Moving to the bridge logged you out of trading.
 *
 * ORDERBOOK-TESTNET-G recorded it: `signableCount: 0`, `hasExtensionAddress:
 * false`, on /bridge. Both stores empty at the same instant is a remount, not a
 * user without accounts.
 *
 * The stack is now mounted inside each route's own layout, where the toggle
 * costs nothing because leaving the route unmounts that subtree anyway.
 */

const APP_DIR = join(__dirname, "..", "app");
const ROOT_LAYOUT = join(APP_DIR, "layout.tsx");

describe("needsEvmWallet - routes that need the provider", () => {
  it("covers both wagmi routes exactly", () => {
    expect(needsEvmWallet("/bridge")).toBe(true);
    expect(needsEvmWallet("/faucet")).toBe(true);
  });

  it("covers their children", () => {
    for (const path of ["/bridge/confirm", "/faucet/history"]) {
      expect({ path, needs: needsEvmWallet(path) }).toEqual({
        path,
        needs: true,
      });
    }
  });

  it("keeps the list and the predicate in agreement", () => {
    for (const route of EVM_WALLET_ROUTES) {
      expect({ route, needs: needsEvmWallet(route) }).toEqual({
        route,
        needs: true,
      });
    }
  });
});

describe("needsEvmWallet - routes that must NOT pay for it", () => {
  it("excludes the trading page", () => {
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
    for (const path of ["/bridgehead", "/faucets", "/bridge-old"]) {
      expect({ path, needs: needsEvmWallet(path) }).toEqual({
        path,
        needs: false,
      });
    }
  });

  it("returns false rather than throwing when there is no pathname", () => {
    for (const path of [null, undefined, ""]) {
      expect(() => needsEvmWallet(path)).not.toThrow();
      expect(needsEvmWallet(path)).toBe(false);
    }
  });
});

describe("the provider is mounted in the routes, not in the root layout", () => {
  it("has a layout mounting EvmWalletProviders for every listed route", () => {
    // Add a route to EVM_WALLET_ROUTES and forget its layout, and its wagmi
    // hooks throw with no provider. This makes that a local test failure.
    const missing: string[] = [];
    for (const route of EVM_WALLET_ROUTES) {
      const layout = join(APP_DIR, route.replace(/^\//, ""), "layout.tsx");
      if (!existsSync(layout)) {
        missing.push(`${route}: no layout.tsx`);
        continue;
      }
      if (!/EvmWalletProviders/.test(readFileSync(layout, "utf8"))) {
        missing.push(`${route}: layout.tsx does not mount EvmWalletProviders`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("does NOT mount it in the root layout - that was the remount bug", () => {
    // The specific regression. A wrapper here whose presence depends on the
    // route moves everything below it on navigation, and React remounts the
    // keyring. The root layout may pass the cookie state down as a VALUE; it
    // must not wrap children in the provider.
    const source = readFileSync(ROOT_LAYOUT, "utf8");
    expect(source).not.toMatch(/EvmWalletProviders/);
    expect(source).not.toMatch(/needsEvmWallet/);
  });

  it("does not let the route predicate decide anything in the root layout", () => {
    // usePathname in the root layout is the shape of the mistake, not just this
    // instance of it: any branch there that changes the tree per route remounts
    // the app's providers on navigation.
    const source = readFileSync(ROOT_LAYOUT, "utf8");
    expect(source).not.toMatch(/usePathname/);
  });
});
