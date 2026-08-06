"use client";

import { Url } from "next/dist/shared/lib/router/router";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ComponentProps, PropsWithChildren, ReactNode } from "react";
import { Accordion, Dropdown, Typography } from "@mitrabook/ux";
import classNames from "classnames";

/**
 * First path segment, or "" at the root. "/trading/WETH-USDT" -> "trading".
 *
 * Segment comparison, not equality, because the Trade link's href is a specific
 * market ("/trading/WETH-USDT", from the last-used market) while the user may be
 * on any other market. An exact match would leave Trade unhighlighted on exactly
 * the page where it matters most. Prefix matching via startsWith would be the
 * other obvious choice, but "/rewards" is a prefix of a hypothetical
 * "/rewards-archive", so segments are the safer comparison.
 *
 * This relies on the nav's routes having distinct first segments - today
 * trading / bridge / rewards / faucet. Two items under one segment would both
 * highlight.
 */
const firstSegment = (path: string): string =>
  path
    .replace(/[?#].*$/, "")
    .split("/")
    .filter(Boolean)[0] ?? "";

interface DropdownProps {
  items: {
    href: string;
    label: string;
    svg?: ReactNode;
  }[];
}

const AccordionMenu = ({
  items,
  children,
}: PropsWithChildren<DropdownProps>) => (
  <Accordion type="multiple">
    <Accordion.Item value={children?.toString() ?? ""}>
      <Accordion.Trigger>
        <Typography.Text size="lg" bold>
          {children as string}
        </Typography.Text>
        <Accordion.Icon />
      </Accordion.Trigger>
      <Accordion.Content>
        <div className="flex flex-col gap-3 mt-1">
          {items.map(({ href, label, svg }, i) => (
            <Typography.Text
              key={i}
              appearance="primary"
              size="md"
              asChild
              className={classNames(
                "py-0.5 duration-200 transition-colors hover:text-textBase",
                i === 0 && "mt-2"
              )}
            >
              <Link
                href={href}
                target="_blank"
                className="w-full flex items-center gap-2"
              >
                {svg}
                {label}
              </Link>
            </Typography.Text>
          ))}
        </div>
      </Accordion.Content>
    </Accordion.Item>
  </Accordion>
);

interface SingleProps extends ComponentProps<"a"> {
  size?: "lg" | "sm";
  disabled?: boolean;
}
const Single = ({
  href,
  size = "sm",
  disabled = false,
  children,
  target,
  rel,
  className,
}: PropsWithChildren<SingleProps>) => {
  const largeText = size === "lg";

  // Analytics sits in the nav between Bridge, Rewards and Faucet but points at
  // explorer.polkadex.ee, and this component previously dropped every prop
  // except href/size/disabled/children - so `target` could not be passed at
  // all, despite SingleProps extending ComponentProps<"a"> and advertising it.
  // Clicking it replaced the trading view, and getting back meant the browser
  // Back button plus a full remount: markets refetched, subscriptions
  // reopened, chart rebuilt.
  //
  // Inferred from the href rather than set per call site, so a future external
  // link cannot forget it. An explicit target still wins, in case an outbound
  // link ever genuinely should navigate in place.
  const isExternal = typeof href === "string" && /^https?:\/\//i.test(href);
  const resolvedTarget = target ?? (isExternal ? "_blank" : undefined);
  // noreferrer alongside noopener: modern browsers imply noopener for
  // target=_blank, but not every in-app webview does.
  const resolvedRel =
    rel ?? (resolvedTarget === "_blank" ? "noopener noreferrer" : undefined);

  // Which nav item you are on had no visual answer: every link rendered
  // identically, so on /bridge the nav gave no sense of place. Derived here
  // rather than passed per call site, so the desktop bar and the mobile menu
  // (which renders the same component) cannot disagree, and so a new link gets
  // it for free.
  //
  // External links are never "current" - you are not on explorer.polkadex.ee.
  // Disabled ones are not either, since they are not reachable.
  const pathname = usePathname() ?? "";
  const isActive =
    !disabled &&
    !isExternal &&
    typeof href === "string" &&
    firstSegment(href) !== "" &&
    firstSegment(href) === firstSegment(pathname);

  return (
    <Typography.Text
      asChild
      size={size}
      bold={largeText}
      // Enabled links use textBase (#FFFFFF) rather than the muted #8B909A.
      // Primary nav is the app's main wayfinding: it was rendering dimmer than
      // the body copy it sits above, which reads as disabled. Genuinely
      // disabled items keep the muted colour AND the opacity below, so the
      // enabled/disabled distinction gets clearer, not weaker.
      appearance={disabled ? "primary" : "base"}
      className={classNames(
        // Tailwind sizes are rem-based, so the root-font scaling in
        // globals.scss already grows these on wide screens. It is not enough
        // on its own: nav links start at the smallest step (text-sm), so they
        // stay the smallest thing on a 4K display even after scaling. This
        // moves them up a step at the same 1680px threshold the root scaling
        // uses, so there is a single breakpoint to reason about.
        "min-[1680px]:text-base",
        !disabled &&
          "transition-colors ease-out duration-300 hover:text-primary-base",
        disabled && "cursor-not-allowed opacity-50",
        // Colour AND an underline bar, deliberately not colour alone: hover
        // already turns a link primary-base, so colour by itself would make the
        // hovered link indistinguishable from the current one. The bar is the
        // part that survives hover. Colour alone would also be the only signal
        // for anyone who cannot distinguish it (WCAG 1.4.1).
        isActive &&
          "text-primary-base relative after:absolute after:-bottom-1.5 after:left-0 after:right-0 after:h-[2px] after:rounded-full after:bg-primary-base",
        // Forwarded last so a call site can override. The mobile menu passes
        // className="text-lg" on several items and it was being dropped along
        // with target, leaving those entries a size smaller than the ones that
        // happened to use the `size` prop instead.
        className
      )}
    >
      <Link
        href={disabled ? "#" : (href as Url)}
        target={disabled ? undefined : resolvedTarget}
        rel={disabled ? undefined : resolvedRel}
        // The non-visual half of the indicator. A screen reader announces "current
        // page" from this; the underline above is invisible to it.
        aria-current={isActive ? "page" : undefined}
        aria-disabled={disabled || undefined}
      >
        {children}
      </Link>
    </Typography.Text>
  );
};

const DropdownMenu = ({
  items,
  children,
}: PropsWithChildren<DropdownProps>) => (
  <Dropdown>
    {/* opacity-50 put these well below the plain links beside them, so the
        same menu bar had two different text brightnesses for no reason. */}
    <Dropdown.Trigger className="gap-2 items-center inline-flex opacity-80 transition-opacity ease-out duration-300 hover:opacity-100 w-full">
      {/* Matches Single above so the dropdown triggers do not end up smaller
          than the plain links sitting beside them. */}
      <Typography.Text className="text-sm min-[1680px]:text-base whitespace-nowrap">
        {children as string}
      </Typography.Text>
      <Dropdown.Icon />
    </Dropdown.Trigger>
    <Dropdown.Content>
      {items.map(({ href, label, svg }, i) => (
        <Dropdown.Item key={i}>
          <Link
            href={href}
            target="_blank"
            className="text-left flex items-center gap-2 text-sm min-[1680px]:text-base w-full"
          >
            {svg}
            {label}
          </Link>
        </Dropdown.Item>
      ))}
    </Dropdown.Content>
  </Dropdown>
);
export const HeaderLink = {
  Accordion: AccordionMenu,
  Dropdown: DropdownMenu,
  Single,
};
