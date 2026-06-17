import { Page } from "@playwright/test";

/**
 * Prevent the TestnetModal from appearing during a test.
 *
 * The TestnetModal is a Radix alertdialog that focus-traps the page when open.
 * Writing the acknowledge key into sessionStorage before navigation stops the
 * useEffect inside TestnetModal from opening it (it checks for this key).
 *
 * The key must be written via addInitScript so it exists before the page's
 * JavaScript executes — a direct sessionStorage.setItem after goto() would be
 * too late (the modal opens synchronously in the first useEffect cycle).
 *
 * Key source: const SESSION_KEY = "testnet-notice-acknowledged"
 * in apps/hestia/src/components/ui/testnetModal.tsx
 */
export async function suppressTestnetModal(page: Page): Promise<void> {
  await page.addInitScript(() => {
    sessionStorage.setItem("testnet-notice-acknowledged", "1");
  });
}

/**
 * Returns a scoped locator for text inside the VISIBLE Radix tooltip popup.
 *
 * Radix Tooltip renders tooltip children TWICE inside the same portal wrapper:
 *   1. A VisuallyHiddenPrimitive copy (role="tooltip", rendered first in DOM)
 *      — present for screen readers, intentionally invisible.
 *   2. The actual visible popup content (no role="tooltip", rendered second in DOM).
 *
 * getByText() matches both spans because they have identical text and class.
 * [data-radix-popper-content-wrapper] scopes to the portal, but both elements
 * are inside it (they're siblings within TooltipContentImpl). Using .last() on
 * the result selects the visible content — Radix always renders the VisuallyHidden
 * copy first and the visible content second, so this ordering is stable.
 *
 * Usage: visibleTooltip(page, "error text")
 */
export function visibleTooltip(page: Page, text: string | RegExp) {
  return page
    .locator("[data-radix-popper-content-wrapper]")
    .getByText(text)
    .last();
}
