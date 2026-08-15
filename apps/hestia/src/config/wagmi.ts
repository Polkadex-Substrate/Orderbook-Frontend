import { defaultWagmiConfig } from "@web3modal/wagmi/react/config";
import { cookieStorage, createStorage } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import type { Chain } from "viem";

import { SUPPORTED_EVM_CHAIN_IDS } from "@/config/bridge";
import { originMismatch, resolveAppOrigin } from "@/config/appOrigin";
import { WALLET_AUTH } from "@/config/walletAuthPolicy";

export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;
if (!projectId) throw new Error("Project ID is not defined");

/*
 * ORDERBOOK-TESTNET-2: "The source https://testnet.polkadex.ee/ has not been
 * authorized yet".
 *
 * This used to be:
 *
 *   url: process.env.NEXT_PUBLIC_APP_URL ?? "<hardcoded mainnet url>"
 *
 * NEXT_PUBLIC_ vars are inlined at BUILD time, so a build that did not receive
 * NEXT_PUBLIC_APP_URL silently declared the testnet bundle to be the MAINNET
 * origin. Reown compares the origin against the project's allowlist and rejects
 * it, and the failure reads like a dashboard problem rather than a missing build
 * arg. See config/appOrigin.ts.
 *
 * In the browser we now use window.location.origin - the origin Reown actually
 * sees, so it cannot disagree with itself - and the env value only for the
 * server pass. A disagreement between the two is reported rather than hidden.
 */
const appOrigin = resolveAppOrigin(
  typeof window !== "undefined" ? window.location.origin : undefined,
  process.env.NEXT_PUBLIC_APP_URL
);

if (
  typeof window !== "undefined" &&
  originMismatch(window.location.origin, process.env.NEXT_PUBLIC_APP_URL)
) {
  // Loud, because it means this bundle was built for a different deployment and
  // every other build-time inlined URL in it is suspect too.
  console.error(
    "[wagmi] NEXT_PUBLIC_APP_URL does not match the origin this app is served " +
      "from. This build was made for a different deployment.",
    { built: process.env.NEXT_PUBLIC_APP_URL, serving: window.location.origin }
  );
}

const metadata = {
  name: "Polkadex Bridge",
  description: "Cross-chain bridge powered by Hyperbridge",
  url: appOrigin,
  icons: ["https://avatars.githubusercontent.com/u/37784886"],
};

// Map of chain ID → wagmi chain object.
// Add an entry here when a new EVM chain is added to BRIDGE_CHAINS in config/bridge.ts.
const WAGMI_CHAIN_MAP: Record<number, Chain> = {
  1: mainnet,
  11155111: sepolia,
};

const chains = SUPPORTED_EVM_CHAIN_IDS.map((id) => WAGMI_CHAIN_MAP[id]).filter(
  Boolean
) as [Chain, ...Chain[]];

export const config = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
  ssr: true,
  storage: createStorage({ storage: cookieStorage }),
  // WalletConnect's core probes indexedDB at construction - only exists in the
  // browser. Server-side (build "Collecting page data" / prerender) skips the
  // connector; cookieToInitialState in layout.tsx doesn't depend on connectors.
  enableWalletConnect: typeof window !== "undefined",
  enableInjected: true,
  enableEIP6963: true,
  enableCoinbase: true,
  /*
   * THE TAB FREEZE. Omitting this key is what caused it.
   *
   * `defaultWagmiConfig` defaults `auth` to email plus seven social providers,
   * and adds an authConnector whenever either is set. That connector builds
   * `W3mFrameProvider`, i.e. the secure.walletconnect.org iframe that the
   * debugger caught looping over MetaMask's inpage messages while Chrome
   * reported the tab unresponsive. See config/walletAuthPolicy.ts for the full
   * account and the test that holds this shut.
   */
  auth: WALLET_AUTH,
});
