import { Fragment, forwardRef, useMemo } from "react";
import { Dropdown, Typography } from "@mitrabook/ux";
import { useNativeApi } from "@orderbook/core/providers/public/nativeApi";
import {
  useSettingsProvider,
  marketCarouselValues,
} from "@orderbook/core/providers/public/settings";
import classNames from "classnames";
import Link from "next/link";
import { RiLifebuoyLine } from "@remixicon/react";
import { useWindowSize } from "usehooks-ts";

import { Markets } from "./markets";

import { EXTERNAL_LINKS } from "@/config/links";
import { LEGAL_LINKS } from "@/config/legalLinks";

export const Footer = forwardRef<
  HTMLDivElement,
  {
    marketsActive?: boolean;
    /** false = render in normal flow (for full-height app layouts like
     *  /trading, where a fixed footer just paints over the content and the
     *  reserve-padding dance is fragile). Default true for scrolling pages. */
    fixedPosition?: boolean;
  }
>(({ marketsActive = false, fixedPosition = true }, ref) => {
  const { marketCarousel, onChangeMarketCarousel } = useSettingsProvider();

  const { width } = useWindowSize();
  const { connected } = useNativeApi();

  const mobileView = useMemo(() => width <= 640, [width]);

  return (
    <Fragment>
      <footer
        ref={ref}
        className={classNames(
          "md:grid md:grid-flow-col-dense md:grid-cols-2 border-y border-primary w-full bg-level-0",
          !mobileView && fixedPosition && "fixed bottom-0 left-0"
        )}
      >
        {marketsActive ? (
          <div className="col-span-4 flex flex-auto">
            <div className="border-r bg-level-2 px-2 border-secondary">
              <Dropdown>
                <Dropdown.Trigger className="items-center inline-flex opacity-50 transition-opacity ease-out duration-300 hover:opacity-100 w-full">
                  <Typography.Text>{marketCarousel}</Typography.Text>
                  <Dropdown.Icon />
                </Dropdown.Trigger>
                <Dropdown.Content>
                  {marketCarouselValues.map((value, i) => (
                    <Dropdown.Item
                      onClick={() => onChangeMarketCarousel(value)}
                      key={i}
                    >
                      <Typography.Text className="text-left block w-full">
                        {value}
                      </Typography.Text>
                    </Dropdown.Item>
                  ))}
                </Dropdown.Content>
              </Dropdown>
            </div>
            <Markets favorite={marketCarousel === "Favourite"} />
          </div>
        ) : (
          <div />
        )}
        <div className="col-span-1 flex flex-1 items-center gap-3 bg-level-1 px-2 py border-l border-secondary w-full justify-end">
          {/* Legal moved out of the header's "More" dropdown, where it sat
              alongside Analytics and made a compliance list compete with a
              product feature. The footer is where these are conventionally
              found, and it keeps them one click from every page.

              Two renderings of the SAME array, swapping at xl. Five inline
              links overflow this bar once the market ticker, status dot and
              Help are also in it, but simply hiding them left 640-1280px with
              no visible legal links at all - reachable only via the hamburger,
              which nobody looks in for a privacy policy. Below xl they
              collapse into one dropdown instead, so the links are visible at
              every width. */}
          {/* target="_blank" even though these are internal routes. Reading the
              privacy policy should not cost you the trading view: navigating in
              place unmounted the whole app, and coming back re-ran market
              fetches, reopened subscriptions and rebuilt the chart. A legal
              document is a reference lookup, not a destination.

              The mobile menu's accordion already opened these in a new tab, so
              the two navs disagreed depending on viewport width. */}
          <div className="hidden xl:flex items-center gap-3">
            {LEGAL_LINKS.map(({ href, label }) => (
              <Typography.Text key={href} appearance="primary" size="xs">
                <Link
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-current"
                >
                  {label}
                </Link>
              </Typography.Text>
            ))}
          </div>
          <div className="xl:hidden flex items-center">
            <Dropdown>
              <Dropdown.Trigger className="items-center inline-flex gap-1 opacity-80 transition-opacity hover:opacity-100">
                <Typography.Text size="xs">Legal</Typography.Text>
                <Dropdown.Icon />
              </Dropdown.Trigger>
              <Dropdown.Content>
                {LEGAL_LINKS.map(({ href, label }) => (
                  <Dropdown.Item key={href}>
                    <Link
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-left block w-full"
                    >
                      {label}
                    </Link>
                  </Dropdown.Item>
                ))}
              </Dropdown.Content>
            </Dropdown>
          </div>
          <div className="flex items-center gap-1">
            <div
              className={classNames(
                "w-2 h-2 rounded-full ",
                connected ? "bg-success-base" : "bg-attention-base"
              )}
            />
            <Typography.Text>
              {connected ? "Connected" : "Connecting"}
            </Typography.Text>
          </div>
          <Typography.Text appearance="primary">
            <Link href={EXTERNAL_LINKS.discord} target="_blank">
              <RiLifebuoyLine className="h-3 w-3 inline-block mr-1" />
              Help & Support
            </Link>
          </Typography.Text>
        </div>
      </footer>
    </Fragment>
  );
});

Footer.displayName = "Footer";
