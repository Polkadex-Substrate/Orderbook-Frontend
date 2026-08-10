/**
 * Single source of truth for outbound community, support and docs links.
 *
 * These used to be hardcoded strings repeated across ~20 files. That is not a
 * tidiness complaint: when the Discord invite changed, a find-and-replace
 * missed a third of the call sites, including the one on the geoblock page,
 * and three different invite codes were live in the tree at the same time.
 * Two Reddit variants (with and without a trailing slash) were also in use.
 *
 * Add a link here and import it. Do not inline a URL in a component.
 */
export const EXTERNAL_LINKS = {
  discord: "https://discord.gg/QNfwPevNG",
  telegram: "https://t.me/Polkadex",
  // Key kept as `twitter` so call sites and icon names stay stable; only the
  // destination moved to x.com.
  twitter: "https://x.com/polkadex",
  reddit: "https://www.reddit.com/r/polkadex",
  github: "https://github.com/Polkadex-Substrate",
  medium: "https://polkadex.medium.com",
  youtube: "https://www.youtube.com/channel/UC6fXRDT4lLKlXG3gP0PP06Q",
  docs: "https://docs.polkadex.ee",
  testnetGuide: "https://polkadex.ee/testnet-guide",
} as const;

export type ExternalLinkKey = keyof typeof EXTERNAL_LINKS;

/**
 * Centralised exchanges listing PDEX. Mainnet only - see config/network.ts.
 * Previously duplicated as two hand-maintained lists (one inline JSX, one an
 * array), which is how they drift.
 */
export const PDEX_EXCHANGES = [
  { name: "Kucoin", href: "https://www.kucoin.com/trade/PDEX-USDT" },
  { name: "Gate.io", href: "https://www.gate.io/trade/PDEX_USDT" },
  {
    name: "AscendEX",
    href: "https://ascendex.com/en/cashtrade-spottrading/usdt/pdex",
  },
  { name: "CoinDCX", href: "https://coindcx.com/trade/PDEXINR" },
] as const;
