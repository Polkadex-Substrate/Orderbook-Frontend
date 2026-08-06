"use client";

import { useEffect, useState } from "react";
import { RiCheckLine, RiClipboardLine } from "@remixicon/react";
import classNames from "classnames";

/**
 * Paste-from-clipboard button for address fields.
 *
 * Wallet addresses are long, unmemorable and always arrive via copy/paste, so
 * a one-tap paste matters most on mobile where the keyboard shortcut does not
 * exist.
 *
 * Three constraints drive the implementation:
 *
 *  - `navigator.clipboard.readText()` needs a SECURE CONTEXT. It is present on
 *    https and on localhost, absent on a plain-http origin.
 *  - **Firefox does not expose readText() to web pages at all** (extensions
 *    only). Chromium may also prompt for permission on first use and reject.
 *  - Both of the above are detectable, so rather than show a button that
 *    silently fails for a whole browser, we render nothing when reading is
 *    unsupported. Those users still have Ctrl/Cmd+V.
 *
 * Support is checked in an effect, not during render: `navigator` does not
 * exist during SSR, and branching on it inline would cause a hydration
 * mismatch.
 */
export const PasteButton = ({
  onPaste,
  className,
  label = "Paste",
}: {
  /** Receives the clipboard text, already trimmed of whitespace/newlines. */
  onPaste: (text: string) => void;
  className?: string;
  label?: string;
}) => {
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<"idle" | "done" | "denied">("idle");

  useEffect(() => {
    setSupported(
      typeof navigator !== "undefined" &&
        typeof navigator.clipboard?.readText === "function"
    );
  }, []);

  useEffect(() => {
    if (state === "idle") return;
    const t = setTimeout(() => setState("idle"), 2000);
    return () => clearTimeout(t);
  }, [state]);

  if (!supported) return null;

  const handleClick = async () => {
    try {
      const text = await navigator.clipboard.readText();
      // Addresses copied from explorers and chat apps routinely carry
      // trailing newlines or stray spaces, which then fail validation for a
      // reason the user cannot see.
      const cleaned = text.replace(/\s+/g, "").trim();
      if (!cleaned) {
        setState("denied");
        return;
      }
      onPaste(cleaned);
      setState("done");
    } catch {
      // Permission denied, or the browser refused. Say so rather than
      // appearing to do nothing.
      setState("denied");
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={
        state === "denied"
          ? "Clipboard access was blocked. Use Ctrl/Cmd+V instead."
          : "Paste from clipboard"
      }
      className={classNames(
        "flex items-center gap-1 shrink-0 px-3 py-2 mr-1 rounded-sm text-xs",
        "transition-colors hover:bg-level-2 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-base",
        state === "denied"
          ? "text-danger-base"
          : "text-secondary hover:text-current",
        className
      )}
    >
      {state === "done" ? (
        <RiCheckLine className="w-3.5 h-3.5" />
      ) : (
        <RiClipboardLine className="w-3.5 h-3.5" />
      )}
      {state === "done" ? "Pasted" : state === "denied" ? "Blocked" : label}
    </button>
  );
};
