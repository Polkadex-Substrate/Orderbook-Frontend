import "@/styles/globals.scss";
import "@aksumite/ui/dist/index.css";
import "@mitrabook/ux/dist/index.css";
import { ReactNode } from "react";
import { Metadata } from "next";
import classNames from "classnames";
import { Work_Sans } from "next/font/google";
import { headers } from "next/headers";
import { cookieToInitialState } from "wagmi";

import { config } from "@/config/wagmi";
import Web3ModalProvider from "@/context";
import { DynamicProviders } from "@/components/ui/DynamicProviders";
import { TestnetModal } from "@/components/ui/testnetModal.lazy";
/**
 * Work Sans, per the brand guidelines (polkadex.ee/mediaKit → BrandGuidelines.md),
 * which name it as the primary typeface at weights 300 / 400 / 600. The app was
 * on Roboto, which is why the UI read as off-brand next to the marketing site.
 *
 * Three weights, not the six Roboto was requesting (100/300/400/500/700/900).
 * next/font/google fetches and subsets each weight at build time, and 100 and
 * 900 were not used anywhere - so this is also a build-time saving.
 *
 * `display: "swap"` so text paints in the fallback immediately rather than
 * blocking on the webfont. On a trading screen, seeing the numbers late is worse
 * than seeing them briefly in the wrong face.
 */
const font = Work_Sans({
  weight: ["300", "400", "600"],
  subsets: ["latin"],
  display: "swap",
});

/**
 * Absolute base for OG/Twitter image URLs.
 *
 * Social crawlers do not resolve relative paths - without metadataBase Next
 * emits a relative og:image and every preview silently renders without an
 * image. Build-time value (NEXT_PUBLIC_*), so it is baked per environment.
 */
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://testnet.polkadex.ee";

const TITLE = "Polkadex Orderbook - non-custodial trading";
const DESCRIPTION =
  "A non-custodial, orderbook-based DEX on Polkadex. Trade directly from " +
  "your wallet - no account, no deposits held by us. Testnet tokens are " +
  "free from the faucet.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "trading",
    "crypto",
    "orderbook",
    "polkadex",
    "decentralized",
    "exchange",
    "testnet",
    "dex",
  ],
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Polkadex Orderbook",
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Polkadex Orderbook testnet - a non-custodial orderbook DEX",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og-image.png"],
  },
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const initialState = cookieToInitialState(
    config,
    (await headers()).get("cookie")
  );

  return (
    <html lang="en" className="scrollbar-hide">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon.png" />

        {/* No maximum-scale/user-scalable lock: blocking pinch-zoom is an
            accessibility failure (WCAG 1.4.4) and iOS ignores it anyway. */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body
        className={classNames(
          "flex flex-col min-h-screen overflow-x-hidden",
          font.className
        )}
      >
        <TestnetModalClient />
        <Web3ModalProvider initialState={initialState}>
          <DynamicProviders>{children}</DynamicProviders>
        </Web3ModalProvider>
      </body>
    </html>
  );
}
