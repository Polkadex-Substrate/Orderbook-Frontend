"use client";

import { PropsWithChildren } from "react";

/**
 * Sticky footer for the order forms.
 *
 * The Buy/Sell button must stay on screen no matter how short the panel is.
 * The form scrolls inside PlaceOrder's `overflow-auto` container, so a button
 * sitting in normal flow at the end of the form scrolls out of view - and
 * because the scrollbar is hidden (`scrollbar-hide`) there is no visual hint
 * that anything is below the fold. On a wide-but-short viewport (4K desktops
 * are typically 16:9, so height is the scarce axis, and the root font scales
 * *up* at that width) the button vanished completely.
 *
 * `sticky bottom-0` pins it to the bottom of the scrollport while the fields
 * above scroll underneath. `mt-auto` keeps it bottom-aligned when the form is
 * shorter than the panel, preserving the layout when there is room to spare.
 *
 * Do not replace this with a pixel min-height on the panel: that is what
 * caused the panel group (which has `overflow: hidden`) to clip the button
 * instead of scrolling it.
 */
export const OrderAction = ({ children }: PropsWithChildren) => (
  <div className="sticky bottom-0 z-10 mt-auto bg-level-0 pt-2">{children}</div>
);
