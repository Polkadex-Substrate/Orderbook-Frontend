import * as React from "react";

/**
 * X (formerly Twitter) logo.
 *
 * The export is still named `Twitter` on purpose: the landing footer resolves
 * icons dynamically via `Icons[val.iconName]`, so renaming this breaks that
 * lookup silently at runtime rather than at compile time. Only the artwork
 * changed — the bird mark was replaced with the X glyph.
 *
 * No `fill` is set so callers can colour it with a Tailwind `fill-*` class,
 * which is how the existing call sites style it.
 */
export function Twitter(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      {...props}
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
