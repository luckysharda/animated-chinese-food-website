"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary: catches throws in the root layout itself, where
 * error.tsx cannot help because the layout is what failed.
 *
 * This replaces the whole document, so globals.css and the font variables are
 * not guaranteed to be applied — every style here is inline on purpose. It has
 * to render correctly with no stylesheet at all.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[umami] root exception:", error);
  }, [error]);

  const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace';

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          background: "#0B0F14",
          color: "#B7C2CE",
          fontFamily: mono,
          fontSize: 15,
          lineHeight: 1.65,
        }}
      >
        <div style={{ margin: "0 auto", maxWidth: 680, padding: "0 24px", width: "100%" }}>
          <p style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#6B7887", margin: "0 0 14px" }}>
            Fault // root layout
          </p>
          <h1 style={{ margin: 0, fontSize: 34, lineHeight: 1.05, color: "#FFFFFF", fontWeight: 700 }}>
            <span style={{ color: "#FFC53D" }}>{"// "}</span>THE PAGE FAILED TO MOUNT
          </h1>
          <p style={{ marginTop: 18, maxWidth: "60ch" }}>
            The error came from the root layout, so nothing else could render. The message is
            below and the full stack is in the browser console.
          </p>

          <div style={{ marginTop: 26, border: "1px solid #2A3543", background: "#151E2A", padding: 20 }}>
            <p style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "#6B7887", margin: "0 0 8px" }}>
              Message
            </p>
            <p style={{ margin: 0, color: "#FFFFFF", wordBreak: "break-word" }}>
              {error.message || "(no message)"}
            </p>
            {error.digest ? (
              <>
                <p style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "#6B7887", margin: "16px 0 8px" }}>
                  Digest
                </p>
                <p style={{ margin: 0, color: "#FFC53D" }}>{error.digest}</p>
              </>
            ) : null}
          </div>

          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 26,
              background: "transparent",
              border: "1px solid #FFC53D",
              color: "#FFC53D",
              padding: "11px 22px",
              fontFamily: mono,
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
