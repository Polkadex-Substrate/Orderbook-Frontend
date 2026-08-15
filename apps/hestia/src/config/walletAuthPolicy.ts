/**
 * Whether Reown's hosted auth iframe is allowed to exist.
 *
 * THE BUG THIS FIXES: THE TAB FREEZE
 * Chrome reported "Page Unresponsive" on /trading, intermittently, roughly once
 * after each deploy. Two earlier explanations were wrong. Pausing the debugger
 * during a freeze settled it: the paused thread was not Main, it was `sdk` - the
 * `w3m-secure-iframe` hosted at secure.walletconnect.org - sitting inside its
 * `onAppEvent` handler with the local `d = {target: 'metamask-inpage', ...}`.
 *
 * That iframe listens on `window` message traffic and filters every message it
 * receives. MetaMask's content script emits a continuous stream of stream-plumbing
 * messages - the console showed `app-init-liveness` and `background-liveness`
 * repeating, along with "11 close listeners added" warnings. The iframe processes
 * all of it. With both present the frame's work never stops, and Chrome declares
 * the tab unresponsive.
 *
 * WHY THE IFRAME WAS THERE AT ALL
 * Nobody added it. `defaultWagmiConfig` from @web3modal/wagmi 5.1.11 defaults
 * `auth` to `{ email: true, socials: ['google','x','discord','farcaster',
 * 'github','apple','facebook'], ... }` and pushes an `authConnector` whenever
 * `email` or a non-empty `socials` is present. That connector constructs
 * `W3mFrameProvider`, which is the iframe. Our config passed no `auth` key, so we
 * inherited all of it: email login, seven social providers, a third-party
 * Datadog RUM agent running inside the frame, and a magic.js bundle.
 *
 * This is the second time a Reown scaffold default has shipped something nobody
 * chose - `enableAnalytics: true` was the first, removed as blocker B3. The
 * pattern is worth naming: this library's defaults are opt-OUT, and every one of
 * them costs either privacy or main-thread time.
 *
 * WHAT WE LOSE
 * Email and social sign-in for the EVM side. They were never part of any flow:
 * the product authenticates with a Polkadot extension, and wagmi exists here
 * only for the Hyperbridge EVM leg, where users arrive with MetaMask or
 * WalletConnect already. If social login is wanted later it should be turned on
 * for the bridge route alone, not for every page including the trading screen.
 *
 * Free of RUNTIME imports so the rule can be tested without loading wagmi or a
 * browser. The one import below is `import type`, which the compiler erases, so
 * nothing from Reown is pulled in when the test runs. It is worth having: typing
 * `socials` as the library's own union means a provider name that Reown does not
 * support fails to compile here rather than being ignored at runtime.
 */

import type { SocialProvider } from "@web3modal/scaffold-utils";

/** The subset of Reown's `auth` option we care about. */
export type WalletAuthOptions = {
  email?: boolean;
  socials?: SocialProvider[];
};

/**
 * What we pass to `defaultWagmiConfig`.
 *
 * Both fields are load-bearing. Reown creates the connector when EITHER `email`
 * is truthy OR `socials` is non-empty, and its defaults set both, so switching
 * off one alone changes nothing.
 */
export const WALLET_AUTH: WalletAuthOptions = {
  email: false,
  socials: [],
};

/**
 * Reown's own rule for whether the auth connector - and therefore the iframe -
 * gets created, transcribed from
 * node_modules/@web3modal/base/dist/esm/adapters/evm/wagmi/utils/defaultConfig.js:
 *
 *     if (mergedAuth.email || mergedAuth.socials?.length) { connectors.push(...) }
 *
 * Restated here so the test can assert our options against the library's actual
 * condition rather than against an assumption about it. If a version bump changes
 * the condition, this comment is where the mismatch will be found.
 */
export const createsSecureIframe = (auth: WalletAuthOptions): boolean =>
  Boolean(auth.email) || (auth.socials?.length ?? 0) > 0;
