/**
 * Offline fallback for the service worker.
 *
 * WHY THIS FILE EXISTS
 * @ducanh2912/next-pwa serves navigations with workbox's NetworkFirst strategy.
 * When the network request fails and there is no cached copy of that page,
 * NetworkFirst has nothing to return, so it throws and the browser reports
 *
 *   The FetchEvent for "/trading/WETHUSDT" resulted in a network error response:
 *   the promise was rejected.
 *   Uncaught (in promise) no-response
 *
 * The user sees a dead tab rather than an explanation. The plugin's document
 * fallback defaults to "/_offline" - "or none if it doesn't exist" - and no such
 * page existed, so there was no fallback at all.
 *
 * NAMED "~offline", NOT "_offline". The App Router treats an underscore-prefixed
 * folder as a private folder and does not create a route for it, so the
 * documented default name silently produces no page. The tilde is the convention
 * the plugin's own App Router docs use.
 *
 * DELIBERATELY MINIMAL. This renders when the network is unavailable, so it must
 * not depend on anything fetched: no market data, no balances, no icons from a
 * CDN. It also must not imply that trading is possible - a cached shell of a
 * trading page would be worse than this, because prices and balances would be
 * stale and the user could act on them.
 */

export const metadata = {
  title: "Offline - Polkadex Orderbook",
};

export default function Offline() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-lg font-semibold text-current">You are offline</h1>
      <p className="max-w-md text-sm leading-relaxed text-primary">
        This page could not be loaded because the network is unavailable.
        Trading, balances and transfers all need a live connection, so nothing
        is shown here rather than showing you numbers that may be out of date.
      </p>
      <p className="max-w-md text-xs leading-relaxed text-primary">
        Your funds are unaffected - they are held on chain, not in this app.
        Reload once you are back online.
      </p>
    </div>
  );
}
