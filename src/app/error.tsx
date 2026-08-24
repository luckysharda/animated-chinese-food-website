"use client";

import { useEffect } from "react";

/**
 * Route-level error boundary.
 *
 * Without this, a client-side throw in production renders Next's default
 * "Application error: a client-side exception has occurred" — which tells you
 * nothing and cannot be acted on. This surfaces the actual message and digest.
 *
 * It also self-heals the most common cause of that message in development:
 * a chunk request that 404s because the dev server restarted (or was swapped
 * for a production server on the same port) while the tab was still open. The
 * HTML in the tab points at chunk hashes that no longer exist. One reload
 * fixes it, and the sessionStorage guard means it can only ever reload once,
 * so a genuine error can never turn into a refresh loop.
 */
const STALE = /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i;
const GUARD = "umami:auto-reloaded";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[umami] client exception:", error);

    if (!STALE.test(error.message)) return;
    try {
      if (sessionStorage.getItem(GUARD)) return; // already tried; don't loop
      sessionStorage.setItem(GUARD, "1");
      location.reload();
    } catch {
      /* private mode / storage blocked — fall through to the UI below */
    }
  }, [error]);

  const stale = STALE.test(error.message);

  return (
    <main className="flex min-h-dvh items-center bg-ink-800 px-6">
      <div className="mx-auto w-full max-w-2xl">
        <p className="micro mb-4">Fault // No.500</p>

        <h1 className="font-display text-[clamp(2rem,5vw,3.5rem)] leading-[0.95] text-text-hi">
          <span className="slashes mr-3">{"//"}</span>
          {stale ? "STALE BUILD" : "SOMETHING THREW"}
        </h1>

        <p className="mt-5 max-w-prose text-text-mid">
          {stale
            ? "This tab is holding a page from a build that no longer exists — the server restarted underneath it. Reloading fetches the current one."
            : "A client-side exception was thrown while rendering. The message is below; it is also in the browser console with a full stack."}
        </p>

        <div className="mt-7 border border-line-100 bg-ink-600 p-5">
          <p className="micro-xs mb-2">Message</p>
          <p className="break-words font-mono text-sm text-text-hi">
            {error.message || "(no message)"}
          </p>
          {error.digest ? (
            <>
              <p className="micro-xs mt-4 mb-2">Digest</p>
              <p className="font-mono text-sm text-amber-400">{error.digest}</p>
            </>
          ) : null}
        </div>

        <div className="mt-7 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="border border-amber-400 px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-amber-400 transition-colors duration-200 hover:bg-amber-400/15"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => {
              try {
                sessionStorage.removeItem(GUARD);
              } catch {}
              location.reload();
            }}
            className="border border-line-200 px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-text-mid transition-colors duration-200 hover:border-text-low hover:text-text-hi"
          >
            Hard reload
          </button>
        </div>
      </div>
    </main>
  );
}
