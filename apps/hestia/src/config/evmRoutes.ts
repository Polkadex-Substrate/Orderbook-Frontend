/**
 * Which routes actually need the EVM wallet stack.
 *
 * WHY THIS EXISTS
 * `Web3ModalProvider` wrapped the entire app from the root layout, so EVERY
 * page booted the full EVM stack on load: WalletConnect core, the
 * `verify.walletconnect.org` iframe, the injected connector and its MetaMask
 * handshake, EIP-6963 discovery, and the Coinbase SDK. The trading page uses
 * none of it. Exactly four files call a wagmi hook and all four live under
 * bridge and faucet:
 *
 *   components/bridge/Form/index.tsx        useWeb3Modal
 *   components/bridge/BridgeProvider.tsx    useAccount, useBalance
 *   components/bridge/confirmTransaction.tsx useSwitchChain
 *   components/faucet/Form/index.tsx        useAccount
 *
 * `BridgeProvider` is rendered only by `BridgeLayout`, which is used only by
 * /bridge, so nothing outside these routes can reach a wagmi hook.
 *
 * WHAT THIS IS FOR RIGHT NOW
 * The trading page has been freezing on load - Chrome's "Page Unresponsive",
 * reproducible on every reload, no exception in Sentry, and the debugger cannot
 * be paused during it. Three explanations have already been wrong. Rather than
 * name a fourth suspect, this removes the whole EVM startup path from the page
 * where the freeze happens. If it survives that, an entire category is
 * eliminated in one deploy; if it does not, we know where to look.
 *
 * That reasoning is a bonus, not the justification. A trading screen booting a
 * wallet stack it never calls is worth removing whatever the outcome.
 *
 * Import-free so the rule is testable without a router.
 */

/** Route prefixes whose subtrees mount a wagmi hook. */
export const EVM_WALLET_ROUTES = ["/bridge", "/faucet"] as const;

/**
 * Does this path need the EVM providers mounted?
 *
 * Prefix matching, because both routes have children (`/bridge?from=...`, and
 * any future `/bridge/confirm`). Anchored at a segment boundary so a route
 * merely STARTING with those letters - `/bridgehead` - does not drag the stack
 * in. Getting that wrong in the other direction is the expensive one: a missing
 * provider makes `useAccount` throw, which breaks the bridge outright, so the
 * test covers both edges.
 */
export const needsEvmWallet = (
  pathname: string | null | undefined
): boolean => {
  if (!pathname) return false;
  return EVM_WALLET_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
};
