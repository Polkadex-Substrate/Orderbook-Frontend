"use client";

import { useEffect, useMemo, useState } from "react";
import * as Sentry from "@sentry/nextjs";

import {
  RELOAD_ATTEMPT_KEY,
  errorCopy,
  isChunkLoadError,
  shouldAutoReload,
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

  useEffect(() => {
    let attempted = false;
    try {
      attempted = !!sessionStorage.getItem(RELOAD_ATTEMPT_KEY);
    } catch {
      // Storage unavailable. Treating it as "already attempted" is the safe
      // direction: no auto-reload rather than a possible loop we cannot count.
      attempted = true;
    }
    setAlreadyAttempted(attempted);

    const chunkError = isChunkLoadError(error);

    // Report either way, but at the severity the situation deserves. A stale
    // chunk after a deploy is expected background noise; an application error
    // is not, and the two should not sit in one Sentry issue.
    Sentry.captureException(error, {
      level: chunkError ? "warning" : "error",
      tags: {
        errorKind: chunkError ? "chunk-load" : "application",
        reloadAlreadyAttempted: String(attempted),
      },
    });

    if (shouldAutoReload(error, attempted)) {
      try {
        sessionStorage.setItem(RELOAD_ATTEMPT_KEY, "1");
      } catch {
        // If we cannot record the attempt we must not reload, or the guard is
        // meaningless and this becomes an infinite loop.
        return;
      }
      // `reload()` alone can be served from the same stale cache. Replacing the
      // URL forces a fresh navigation and a current manifest.
      window.location.replace(window.location.href);
    }
  }, [error]);

  const copy = useMemo(
    () => errorCopy(error, alreadyAttempted),
    [error, alreadyAttempted]
  );

  const onAction = () => {
    if (isChunkLoadError(error)) {
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
