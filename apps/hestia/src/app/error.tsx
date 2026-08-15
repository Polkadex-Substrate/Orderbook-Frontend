"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as Sentry from "@sentry/nextjs";

import {
  RELOAD_ATTEMPT_KEY,
  errorCopy,
  isChunkLoadError,
} from "./errorRecovery";

/**
 * The route error boundary.
 *
 * This used to render a bare "Something went wrong!" and nothing else. Next
 * passes a `reset` callback here and it was unused, so every error that reached
 * this boundary was a dead end with no retry and no explanation.
 *
 * That mattered most for `ChunkLoadError`, which is not an application bug at
 * all: after a deploy a stale service worker serves a cached build manifest
 * naming chunk files the new build no longer has. See errorRecovery.ts.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
}) {
  const [alreadyAttempted, setAlreadyAttempted] = useState(false);
  const reported = useRef(false);

  /*
   * THE AUTOMATIC RELOAD IS GONE. It caused a worse bug than it fixed.
   *
   * This effect used to be keyed on `[error]` and did two dangerous things at
   * once: it called `setAlreadyAttempted` AND `window.location.replace`. Next
   * can hand the boundary a fresh `error` object identity on each render, so
   * the effect re-ran, set state, re-rendered, re-ran. An infinite render loop,
   * which Chrome reports as "Page Unresponsive".
   *
   * The reported signature matched exactly: it hung ONCE, after a deployment,
   * on a cached page - which is precisely when a stale service worker serves a
   * manifest naming chunks the new build no longer has, and therefore precisely
   * when this boundary is reached.
   *
   * Before that change the boundary rendered a static dead end. So the
   * "improvement" converted a visible dead end into an invisible hang, and a
   * hang is worse: the user cannot even read the message or click away.
   *
   * A button does the same job without any of the risk. It cannot loop, it
   * cannot navigate on its own, and the user can see what is being offered.
   * `[]` deps and a ref guard mean this runs exactly once per mount no matter
   * what identity `error` has.
   */
  useEffect(() => {
    if (reported.current) return;
    reported.current = true;

    let attempted = false;
    try {
      attempted = !!sessionStorage.getItem(RELOAD_ATTEMPT_KEY);
    } catch {
      attempted = true;
    }
    setAlreadyAttempted(attempted);

    const chunkError = isChunkLoadError(error);

    // Reported at the severity the situation deserves. A stale chunk after a
    // deploy is expected background noise; an application error is not, and the
    // two should not share a Sentry issue.
    Sentry.captureException(error, {
      level: chunkError ? "warning" : "error",
      tags: {
        errorKind: chunkError ? "chunk-load" : "application",
        reloadAlreadyAttempted: String(attempted),
      },
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const copy = useMemo(
    () => errorCopy(error, alreadyAttempted),
    [error, alreadyAttempted]
  );

  const onAction = () => {
    if (isChunkLoadError(error)) {
      // User-initiated, so no loop is possible: nothing here runs without a
      // click. Recorded so the copy can stop claiming a reload will help if the
      // user lands back here.
      try {
        sessionStorage.setItem(RELOAD_ATTEMPT_KEY, "1");
      } catch {
        // Not being able to record it only costs us the second-attempt wording.
      }
      window.location.replace(window.location.href);
      return;
    }
    reset?.();
  };

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h2 className="text-xl font-bold">{copy.title}</h2>
      <p className="max-w-[46ch] text-sm text-primary">{copy.detail}</p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onAction}
          className="rounded-sm bg-primary-hover px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          {copy.action}
        </button>
        <a
          href="/"
          className="rounded-sm border border-primary px-4 py-2 text-sm"
        >
          Go to home
        </a>
      </div>
      {error?.digest && (
        <p className="text-xs text-primary opacity-70">
          Reference: {error.digest}
        </p>
      )}
    </div>
  );
}
