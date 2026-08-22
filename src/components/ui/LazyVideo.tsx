"use client";

/**
 * LazyVideo — a decorative process loop that only decodes while it is on screen.
 *
 * muted + playsInline + loop + preload="none" + poster, and an IntersectionObserver
 * that play()s on enter and pause()s on exit, so the five clips on the page are
 * never all decoding at once. preload="none" means nothing but the poster is
 * fetched until the first play().
 *
 * play() rejects whenever the browser declines (tab hidden, gesture policy, the
 * element unmounted mid-promise). That rejection is swallowed on purpose — the
 * poster is already a correct end state.
 *
 * Reduced motion: the clip never starts. The poster stands in for it.
 */

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export function LazyVideo({
  src,
  poster,
  className,
}: {
  src: string;
  poster: string;
  className?: string;
}): React.ReactElement {
  const ref = useRef<HTMLVideoElement | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Set as a PROPERTY too: React writes the attribute, and some engines read
    // the property when deciding whether an unattended play() is allowed.
    el.muted = true;

    if (reduced) {
      el.pause();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const played = el.play();
            if (played && typeof played.catch === "function") {
              played.catch(() => {
                /* declined by the browser — the poster stays up */
              });
            }
          } else if (!el.paused) {
            el.pause();
          }
        }
      },
      { threshold: 0.2 },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      el.pause();
    };
  }, [reduced]);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      className={className}
      muted
      loop
      playsInline
      preload="none"
      controls={false}
      disablePictureInPicture
      aria-hidden
    />
  );
}

export default LazyVideo;
