"use client";

import { useEffect, useState } from "react";
import { RiVolumeUpLine, RiVolumeMuteLine } from "@remixicon/react";
import {
  getFromStorage,
  isFillSoundEnabled,
  playFillSound,
  setToStorage,
} from "@orderbook/core/helpers";
import { LOCAL_STORAGE_ID } from "@orderbook/core/constants";

/**
 * The on/off switch for the order-fill sound.
 *
 * REQUESTED 2026-08-10: "usually some sound should come once the order
 * executes... that's how it is in a few CEXs". Default off - see
 * helpers/fillSound.ts for why.
 *
 * IT PLAYS THE SOUND WHEN YOU TURN IT ON, deliberately, for two reasons:
 *   1. It is the only way to find out what you just enabled. A silent
 *      confirmation of a sound setting tells you nothing.
 *   2. Browsers only permit audio after a user gesture. Clicking this IS that
 *      gesture, so the preview both demonstrates the sound and proves the tab is
 *      allowed to make it - before a real fill depends on it.
 *
 * The value is read once on mount rather than during render because
 * localStorage is not available on the server, and reading it in the render body
 * makes the first client render disagree with the server's and trip hydration.
 */
export const FillSoundToggle = () => {
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setEnabled(isFillSoundEnabled(getFromStorage(LOCAL_STORAGE_ID.FILL_SOUND)));
    setReady(true);
  }, []);

  const onToggle = () => {
    const next = !enabled;
    setEnabled(next);
    // Stored as the literal string "true"/"false". The reader now defaults ON
    // and switches off only for an explicit "false" - the sound shipped opt-in
    // and the tester who requested it never heard it, because nobody discovers
    // a toggle for a sound that has never played.
    setToStorage(LOCAL_STORAGE_ID.FILL_SOUND, String(next));
    if (next) playFillSound();
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onToggle}
      // Until the stored value has been read, the switch renders in its default
      // (off) position, which is also the correct default - so there is no
      // flash of the wrong state, only a brief inability to be sure.
      aria-busy={!ready}
      className="flex w-full items-center justify-between gap-3 rounded-md bg-level-1 px-4 py-3 text-left transition-colors hover:bg-level-2"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-level-2">
          {enabled ? (
            <RiVolumeUpLine className="h-4 w-4 text-primary-base" />
          ) : (
            <RiVolumeMuteLine className="h-4 w-4 text-primary" />
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-sm text-textBase">
            Sound when an order fills
          </span>
          <span className="text-xs text-primary">
            {enabled ? "On" : "Off"} - only while this tab is open
          </span>
        </div>
      </div>

      {/* Presentational only; the button carries role="switch" and aria-checked,
          so a screen reader announces the state from the button itself. */}
      <span
        aria-hidden
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          enabled ? "bg-primary-base" : "bg-level-3"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
            enabled ? "left-[1.125rem]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
};
